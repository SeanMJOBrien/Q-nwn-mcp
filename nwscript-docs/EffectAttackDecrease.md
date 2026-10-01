<!-- Source: https://nwnlexicon.com/index.php/EffectAttackDecrease -->

# EffectAttackDecrease(int, int)
Create an Attack Decrease effect. 
int EffectAttackDecrease( int nPenalty, int nModifierType=ATTACK_BONUS_MISC);
#### Parameters 

nPenalty
    The amount of the penalty to apply. Must be 1 or higher to apply. Maximum effect is determined by Combat Max Attack Bonus game/server option or GetAttackBonusLimit, but the integer can apparently just be any valid positive int and it'll just cap at the relevant maximum. 

nModifierType
    One of the three ATTACK_BONUS_* constants or other values for creature weapons and unarmed, defining which handed weapon receives the bonus. MISC stacks while the others are compared to the weapon enchantment bonuses and highest will apply. (Default:  ATTACK_BONUS_MISC )
#### Description
Returns a new effect object that when applied to a creature, will decrease their attack bonus if ATTACK_BONUS_MISC is used. This will stack. 
If any other ATTACK_BONUS_* value is used, then the effect will not stack and the highest penalty (between these effects plus the attack penalties on the weapon/slot) will apply, see the Effect Breakdown below for further details. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
The limit of nValue is unknown but the upper effective limit would be found with GetAttackBonusLimit. Higher amounts just get capped. 
#### Remarks
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject) Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Other Effects
These also apply EffectAttackDecrease, as hidden effects: 
  * EffectSlow if there are more slow effects than haste effects, applies a ATTACK_BONUS_MISC penalty of 2
  * EffectNegativeLevel applies a ATTACK_BONUS_MISC penalty equal to the amounts of negative levels.
  * EffectEntangle applies a ATTACK_BONUS_MISC penalty of 2. Not sure if more than one stacks but likely it does.
  * Called Shot: Arms applies a ATTACK_BONUS_MISC penalty of 2 for 24 seconds, controlled by ruleset.2da if you want to alter it.

#### Effect Breakdown
Okay so the main thing with this function is there are two modes of application: 
  1. You use ATTACK_BONUS_MISC for a generic penalty to all attack rolls, but won't affect damage penetration, and it can stack properly with each other and weapon penalties. Equipping a +3 Longsword with an EffectAttackDecrease(2, ATTACK_BONUS_MISC) will be able to penetrate DR up to x/+3 and have a +1 modifier to hit.
  2. You use ATTACK_BONUS_(slot) as noted below for a non-stacking penalty that works in conjunction with the relevant slots specific attack penalties. For instance equipping a -3 Enchanted Longsword in the INVENTORY_SLOT_RIGHTHAND will essentially call EffectAttackDecrease(3, ATTACK_BONUS_ONHAND) while it's equipped. If you then apply an EffectAttackDecrease(1, ATTACK_BONUS_ONHAND) then the higher 3 value will be used for the attack penalty, but if you apply EffectAttackDecrease(5, ATTACK_BONUS_ONHAND) you will get -5 to attack.

Damage penetration is always taken from the highest specific EffectAttackIncrease - so having a +2 Longsword, and a EffectAttackDecrease(5, ATTACK_BONUS_ONHAND) applied will still mean they can penetrate x/+2 damage reduction but their attack rolls are at -3 to hit with the weapon. 
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
0 | nPenalty | Attack penalty applied   
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
#### Version
1.62 
#### Example
// Sample code for applying 5 attack penalty to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eAttackDecrease = EffectAttackDecrease(5); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eAttackDecrease, oTarget);}
#### See Also
functions:  | EffectAttackIncrease  EffectModifyAttacks   

constants:  |  ATTACK_BONUS_* Constants
