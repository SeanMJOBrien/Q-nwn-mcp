<!-- Source: https://nwnlexicon.com/index.php?title=SetEffectCasterLevel&amp;action=history -->

# SetEffectCasterLevel(effect, int)
Sets the effect caster level. 
void SetEffectCasterLevel( effect eEffect, int nCasterLevel);
#### Parameters 

eEffect
    The effect (or linked effects) to update the spell Id of 

nCasterLevel
    The caster level of the effect for the purposes of dispel magic and GetEffectCasterLevel. Must be >= 0.
#### Description
Sets the effect caster level. Use this after a linked set of effects is created similar to TagEffect. 
#### Remarks
This can set the caster level of the effects, that is later returned by GetEffectCasterLevel. This can be used to replicate a spell being cast on a target that will look identical to a full spell being fired. It will primarily be used by EffectDispelMagicAll and EffectDispelMagicBest. 
By default the caster level is set to 0, or set based on the Spell Script being fired. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
// Replicate Shield Spell effects and apply them as if a level 10 caster did itvoid main(){ // The caster can be the first PC in this example, is also the target object oCaster = GetFirstPC(); object oTarget = oCaster; int nCasterLevel = 10; // 10 Turns // Define the effects effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); effect eArmor = EffectACIncrease(4, AC_DEFLECTION_BONUS); effect eSpell = EffectSpellImmunity(SPELL_MAGIC_MISSILE); effect eDur = EffectVisualEffect(VFX_DUR_GLOBE_MINOR); effect eLink = EffectLinkEffects(eArmor, eDur); eLink = EffectLinkEffects(eLink, eSpell); // Set the caster of the spell, sp eLink = SetEffectCasterLevel(eLink, nCasterLevel); eLink = SetEffectCreator(eLink, oCaster); eLink = SetEffectSpellId(eLink, SPELL_SHIELD); // Fire spell cast at event for target SignalEvent(oTarget, EventSpellCastAt(oCaster, SPELL_SHIELD, FALSE)); // Apply VFX impact and bonus effects ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oTarget, TurnsToSeconds(nCasterLevel));}
#### See Also
functions:  |  SetEffectCreator, SetEffectSpellId
