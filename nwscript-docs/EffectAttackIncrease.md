<!-- Source: https://nwnlexicon.com/index.php/EffectAttackIncrease -->

# EffectAttackIncrease(int, int)
Create an Attack Increase effect 
effect EffectAttackIncrease( int nBonus, int nModifierType=ATTACK_BONUS_MISC);
#### Parameters 

nBonus
    The amount of the bonus to apply. Must be 1 or higher to apply. Maximum effect is determined by Combat Max Attack Bonus game/server option or GetAttackBonusLimit, but the integer can apparently just be any valid positive int and it'll just cap at the relevant maximum. 

nModifierType
    One of the three ATTACK_BONUS_* constants or other values for creature weapons and unarmed, defining which handed weapon receives the bonus. MISC stacks while the others are compared to the weapon enchantment bonuses and highest will apply. (Default:  ATTACK_BONUS_MISC )
#### Description
Returns a new effect object that when applied to a creature, will increase their attack bonus if ATTACK_BONUS_MISC is used. This will stack. 
If any other ATTACK_BONUS_* value is used, then the effect will not stack and the highest modifier (plus what the weapon modifier itself has) will apply, see the Effect Breakdown below for further details. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
The limit of nValue is unknown but the upper effective limit would be found with GetAttackBonusLimit. Higher amounts just get capped. 
#### Remarks
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject) Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Okay so the main thing with this function is there are two modes of application: 
  1. You use ATTACK_BONUS_MISC for a generic bonus to the rolls, but not damage penetration, and it can stack properly with each other and weapon attack bonuses. Equipping a +3 Longsword with an additional EffectAttackIncrease(3, ATTACK_BONUS_MISC) will be able to penetrate DR up to x/+3 and have a +6 modifier to hit.
  2. You use ATTACK_BONUS_(slot) as noted below for a non-stacking bonus that works in conjunction with the relevant slots enchantment bonus - the highest of which is taken when penetrating EffectDamageReduction and the bonus which applies. For instance equipping a +3 Enchanted Longsword in the INVENTORY_SLOT_RIGHTHAND will essentially call EffectAttackIncrease(3, ATTACK_BONUS_ONHAND) while it's equipped. If you then apply an EffectAttackIncrease(1, ATTACK_BONUS_ONHAND) then the higher 3 value will be used for the attack bonus and DR penetration up to x/+3, but if you apply EffectAttackIncrease(5, ATTACK_BONUS_ONHAND) you will get +5 to attack and can penetrate DR up to x/+5.

Note that EffectAttackDecrease for specific slots can't low the DR penetration amount, so a +3 Longsword can still penetrate x/+3 Damage Reduction, even if EffectAttackDecrease(5, ATTACK_BONUS_ONHAND) is applied. 
This is odd and of course since Bioware never used anything other than ATTACK_BONUS_MISC in spells not well tested or known about. 
Some other caveats: 
  * Unarmed: ATTACK_BONUS_ONHAND will stack with ATTACK_BONUS_UNARMED in the character sheet but only applies the highest of the two when attacking. Unarmed refers to no weapons and no creature weapons. Gloves and Bracers would usually apply this bonus, if any, if you wanted to check for existing bonuses of the ATTACK_BONUS_UNARMED type.
  * Offhand: ATTACK_BONUS_OFFHAND will only apply to the offhand weapon if equipped, or nothing if unarmed or only righthand is equipped
  * Creature: ATTACK_BONUS_UNARMED will not work on the creature weapons (and vice versa), only on the specific slot if chosen to attack with it at random.

So it seems reasonably sane now it is clear that anything other than ATTACK_BONUS_MISC will not stack as such. 
To add additional bonuses that "stack" with the current weapon equipped, you could use the OnPlayerEquipItem event to add an appropriate bonus effect that goes appropriately higher. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nBonus | Attack bonus applied   
1 | nModifierType | Type of modifier to apply. Defaults to ATTACK_BONUS_MISC. Valid values appear to be as per below, although constants are only defined for the first 3. For how this operates see above. 
  * ATTACK_BONUS_MISC (0)
  * ATTACK_BONUS_ONHAND (1)
  * ATTACK_BONUS_OFFHAND (2)
  * ATTACK_BONUS_CWEAPON1 (3)
  * ATTACK_BONUS_CWEAPON2 (4)
  * ATTACK_BONUS_CWEAPON3 (5)
  * ATTACK_BONUS_UNARMED (7)

Value 6 is undefined / invalid / unused and defaults back to 0.   
2 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
3 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
#### Known Bugs
Not a bug par say but the ATTACK_BONUS_MISC doesn't penetrate DR and stacks by design, although it did previously in NWN's lifetime. 
Also not a bug as such but the other ATTACK_BONUS_* amounts correctly apply a bonus if it's the highest one for that particular slot but it is confusing. 
There is a minor visual bug that when there are 2 attack bonuses and one is removed with RemoveEffect the icon in the top right is removed for both. 
#### Version
1.62 
#### Example
// Sample code for applying a 5 attack bonus to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eACIncrease = EffectAttackIncrease(5); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eACIncrease, oTarget);}
#### See Also
functions:  |  EffectModifyAttacks   

constants:  |  ATTACK_BONUS_* Constants
