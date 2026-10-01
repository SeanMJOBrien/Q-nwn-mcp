<!-- Source: https://nwnlexicon.com/index.php/EffectSlow -->

# EffectSlow()
Creates a slow effect. 
effect EffectSlow();
#### Description
Returns an effect type of Slow. 
Slowed creatures have no benefits from any haste applied to them, or if they have no haste, have 1 attack per round, -2 AC, -2 attack, -2 Reflex Saving Throw, and -50% movement speed. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Slow is not overridden or dispelled by, but merely overlaps with Haste, as in they just cancel each other. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
There is no information available from the effect with GetEffectInteger or similar. 
EffectHaste and EffectSlow have a kind of "balancing act" when applied or removed. They count up and apply one or the other depending on the amount, with a equal balance meaning neither applies. This was likely done because of the permanent Haste magical items. 
EffectSlow has these internal effects applied: 
  * EffectACDecrease(2, AC_DODGE_BONUS, AC_VS_DAMAGE_TYPE_ALL)
  * EffectSavingThrowDecrease(SAVING_THROW_REFLEX, 2, SAVING_THROW_TYPE_ALL)
  * EffectAttackDecrease(2, ATTACK_BONUS_MISC)
  * EffectMovementSpeedDecrease(50) 
    * Plus a "Movement limit" status (similar to EffectDazed) - this forces you to walk. This means your maximum movement speed is based off a walk speed of 2m/s not the run speed of 4m/s (for NPCs its slightly slower). At maximum non-monk speed therefore it is 3m/s (150%). It really makes you slow.
  * "Slow" status: 
    * Have SLOWED_ATTACKS (default 1) for their on hand attacks (before flurry, rapid shot etc. apply).

The properties of slow do not _entirely_ match DnD but are "pretty darn close". Note one "partial action" is allowed: 
> Affected creatures move and attack at a drastically slowed rate. Slowed creatures can take only a partial action each turn. Additionally, they suffer 2 penalties to AC, melee attack rolls, melee damage rolls, and Reflex saves. Slowed creatures jump half as far as normal.
Partial actions include spellcasting, and the movement speed limit part of EffectSlow helps to make it so not much else can happen in the same 6 seconds. However Quickened spells can still be cast thus two per round if a quickened and normal spell is done. 
#### Version
1.62 
#### Example
// Sample code for applying slow to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eSlow = EffectSlow(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SLOW); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eSlow, oTarget);}// Example 1 - Create a slow effect and apply it to a PCobject oPC = GetLastUsedBy();effect eSlow = EffectSlow();ApplyEffectToObject(DURATION_TYPE_INSTANT,eSlow,oPC,30.0f);// Example 2 - Use EffectSlow() directly without defining an effect// variable.object oPC = GetLastUsedBy();ApplyEffectToObject(DURATION_TYPE_INSTANT,EffectSlow(),oPC,30.0f);
#### See Also
functions:  |  EffectHaste
