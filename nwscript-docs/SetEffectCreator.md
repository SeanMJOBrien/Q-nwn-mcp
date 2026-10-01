<!-- Source: https://nwnlexicon.com/index.php?title=SetEffectCreator&amp;action=history -->

# SetEffectCreator(effect, object)
Sets the effect creator. 
void SetEffectCreator( effect eEffect, object oCreator);
#### Parameters 

eEffect
    The effect (or linked effects) to update the creator of 

oCreator
    The creator of the effect. Can be OBJECT_INVALID.
#### Description
Sets the effect creator. Use this after a linked set of effects is created similar to TagEffect. 
#### Remarks
This can set the creator of the effects, that is later returned by GetEffectCreator. 
By default the creator is the object running the script (or AOE creator in an AOE script). This allows you to replicate a spell effects being cast from any caster, or even an invalid object if you do not want them removed when said creator of the effects rests. 
If oCreator is an Area of Effect object it uses the creator instead, although used stored variables by default for the caster level and spell ID. 
Note: If you use this on EffectAreaOfEffect say to make a script have the oCreator be a random creature, that creatures last spellcasting information (if any) may be saved to the AOE for use there (eg GetSpellSaveDC etc.). You should take this into account if you mess around with the creator of AOE effects and make sure to test thoroughly. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
// Replicate Shield Spell effects and apply them as if a level 10 caster did itvoid main(){ // The caster can be the first PC in this example, is also the target object oCaster = GetFirstPC(); object oTarget = oCaster; int nCasterLevel = 10; // 10 Turns // Define the effects effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); effect eArmor = EffectACIncrease(4, AC_DEFLECTION_BONUS); effect eSpell = EffectSpellImmunity(SPELL_MAGIC_MISSILE); effect eDur = EffectVisualEffect(VFX_DUR_GLOBE_MINOR); effect eLink = EffectLinkEffects(eArmor, eDur); eLink = EffectLinkEffects(eLink, eSpell); // Set the caster of the spell, sp eLink = SetEffectCasterLevel(eLink, nCasterLevel); eLink = SetEffectCreator(eLink, oCaster); eLink = SetEffectSpellId(eLink, SPELL_SHIELD); // Fire spell cast at event for target SignalEvent(oTarget, EventSpellCastAt(oCaster, SPELL_SHIELD, FALSE)); // Apply VFX impact and bonus effects ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oTarget, TurnsToSeconds(nCasterLevel));}
#### See Also
functions:  |  SetEffectSpellId, SetEffectCasterLevel
