<!-- Source: https://nwnlexicon.com/index.php?title=SetEffectSpellId&amp;action=history -->

# SetEffectSpellId(effect, int)
Sets the effect spell id. 
void SetEffectSpellId( effect eEffect, int nSpellId);
#### Parameters 

eEffect
    The effect (or linked effects) to update the spell Id of 

nSpellId
    The spell id for the purposes of effect stacking, dispel magic and GetEffectSpellId. Must be >= -1 (-1 being invalid/no spell)
#### Description
Sets the effect spell id. Use this after a linked set of effects is created similar to TagEffect. 
#### Remarks
This can set the spell Id of the effects, that is later returned by GetEffectSpellId. This can be used to replicate a spell being cast on a target that will look identical to a full spell being fired. It can be used to stop certain effects stacking, affect dispel magic checks and so forth. 
By default the spell Id is set based on the Spell Script being fired, or is -1 if no spell script is being fired. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
// Replicate Shield Spell effects and apply them as if a level 10 caster did itvoid main(){ // The caster can be the first PC in this example, is also the target object oCaster = GetFirstPC(); object oTarget = oCaster; int nCasterLevel = 10; // 10 Turns // Define the effects effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); effect eArmor = EffectACIncrease(4, AC_DEFLECTION_BONUS); effect eSpell = EffectSpellImmunity(SPELL_MAGIC_MISSILE); effect eDur = EffectVisualEffect(VFX_DUR_GLOBE_MINOR); effect eLink = EffectLinkEffects(eArmor, eDur); eLink = EffectLinkEffects(eLink, eSpell); // Set the caster of the spell, sp eLink = SetEffectCasterLevel(eLink, nCasterLevel); eLink = SetEffectCreator(eLink, oCaster); eLink = SetEffectSpellId(eLink, SPELL_SHIELD); // Fire spell cast at event for target SignalEvent(oTarget, EventSpellCastAt(oCaster, SPELL_SHIELD, FALSE)); // Apply VFX impact and bonus effects ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oTarget, TurnsToSeconds(nCasterLevel));}
#### See Also
functions:  |  SetEffectCreator, SetEffectCasterLevel
