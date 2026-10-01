<!-- Source: https://nwnlexicon.com/index.php?title=TouchAttackRanged&amp;action=history -->

# TouchAttackRanged(object, int)
Executes and determines the results of a ranged touch attack. 
int TouchAttackRanged( object oTarget, int bDisplayFeedback = TRUE, object oAttacker = OBJECT_SELF);
#### Parameters 

oTarget
    Target of the ranged touch attack. 

bDisplayFeedback
    Display visual feedback. (Default: TRUE) 

oAttacker
    The attacker making the touch attack. (Default: OBJECT_SELF)
#### Description
The caller will perform a ranged touch attack on oTarget. This is not an action, and it assumes oAttacker is already within range of oTarget. 
Returns 0 on a miss, 1 on a hit, and 2 on a critical hit. 
#### Remarks
Generally used to script special abilities such as laying on hands on undead (requires a touch attack to work). 
No combat animations are performed, and no damage is dealt. It simply does a roll to see if the target is hit, and if bDisplayFeedback is TRUE, displays feedback in the combat feedback window. 
The attackers ranged touch attacks are based on: 
  * BAB + dexterity modifier + misc attack increasing effects

A touch attack denies the defender their armor and shield AC (base and bonus), as well as their natural armor bonus to AC. All other armor class modifiers, such as the size modifier, dexterity modifier, and deflection/dodge bonus apply (or don't apply, e.g. if flat-footed) normally. Consequentially, touch attacks sometimes have a significantly better chance of hitting than regular attacks. 
Touch attacks are affected by concealment and miss chance effects when a creature is making the attack. 
#### Known Bugs
Critical hits are automatic on a roll of 20 but do not check oTarget for critical hit immunity. 
#### Version
This function was updated in 1.83.8193.21 of NWN:EE. It made it so weapon attack bonuses are not added to touch attacks, for instance arming yourself with a +5 Dart will not add 5 to the attack rolls of this function anymore. 
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added oAttacker parameter to TouchAttackRanged(). 
#### Example
// Here is a Bioware scrtip as an example. This implements // the special ability of a Steam Mephit, which btw can be// given to any creature by editing the Special Abilities tab.// (nw_s1_mephsteam.nss)//:://///////////////////////////////////////////////:: Steam Mephit Breath//:: NW_S1_MephSteam//:: Copyright (c) 2001 Bioware Corp.//::///////////////////////////////////////////////* Steam Mephit shoots out a bolt of steam that causes 1d4 damage and reduces AC by 4 and Attack by 2*///::////////////////////////////////////////////////:: Created By: Preston Watamaniuk//:: Created On: May 11, 2001//:://////////////////////////////////////////////void main(){ // Declare major variables object oTarget = GetSpellTargetObject(); int nHD = GetHitDice(OBJECT_SELF); effect eVis = EffectVisualEffect(VFX_IMP_ACID_S); effect eBolt, eAttack, eAC; effect eDur = EffectVisualEffect(VFX_DUR_CESSATE_NEGATIVE); //Roll damage int nDamage = d4(); //Adjust the damage based on the Reflex Save, Evasion and Improved Evasion. nDamage = GetReflexAdjustedDamage(nDamage, oTarget, GetSpellSaveDC(),SAVING_THROW_TYPE_FIRE); //Make a ranged touch attack int nTouch = TouchAttackRanged(oTarget); if(nDamage == 0) {nTouch = 0;} if(nTouch &gt; 0) { if(nTouch == 2) { nDamage *= 2; } //Fire cast spell at event for the specified target SignalEvent(oTarget, EventSpellCastAt(OBJECT_SELF, SPELLABILITY_MEPHIT_STEAM_BREATH)); //Set damage, AC mod and attack mod effects eBolt = EffectDamage(nDamage, DAMAGE_TYPE_FIRE); eAC = EffectACDecrease(4); eAttack = EffectAttackDecrease(2); effect eLink = EffectLinkEffects(eAC, eAttack); eLink = EffectLinkEffects(eLink, eDur); //Apply the VFX impact and effects ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oTarget, RoundsToSeconds(3)); ApplyEffectToObject(DURATION_TYPE_INSTANT, eBolt, oTarget); ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); }}
#### See Also
functions:  |  TouchAttackMelee
