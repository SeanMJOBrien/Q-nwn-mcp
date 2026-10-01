<!-- Source: https://nwnlexicon.com/index.php?title=EffectRunScript&amp;action=history -->

# EffectRunScript(string, string, string, float, string)

Create a RunScript effect. 
effect EffectRunScript( string sOnAppliedScript = "", string sOnRemovedScript = "", string sOnIntervalScript = "", float fInterval = 0.0f, string sData = "");
### Parameters 

sOnAppliedScript
    An optional script to execute when the effect is applied. 

sOnRemovedScript
    An optional script to execute when the effect is removed (by RemoveEffect, death, resting, or EffectDispelMagicBest/EffectDispelMagicAll, or a linked effect has expired/been removed) 

sOnIntervalScript
    An optional script to execute every fInterval seconds. 

fInterval
    The interval in seconds, must be >0.0f if an interval script is set. Very low values may have an adverse effect on performance. 

sData
    An optional string of data saved in the effect, retrievable with GetEffectString() at index 0.
### Description
Create a RunScript effect. 
When applied as instant effect, only sOnAppliedScript will fire. 
In the scripts, OBJECT_SELF will be the object the effect is applied to. To retrieve the effect creator in those scripts use GetEffectCreator(GetLastRunScriptEffect()); (useful for assigning messages/sources of further effects). 
Use GetLastRunScriptEffect in sOnAppliedScript, sOnRemovedScript and sOnIntervalScript to retrieve this effect, and GetLastRunScriptEffectScriptType to retrieve which of the 3 events is currently firing (this allows you to use one script name for all 3 events to simplify the amount of scripts you use). 
Note that in the sOnAppliedScript, that the effect GetLastRunScriptEffect has not yet _really_ been applied (it won't appear in a check of effects using GetFirstEffect) so some effect checking functions like GetEffectDurationRemaining won't work. 
### Remarks
This function can be used to do several very useful functions in the game, in particular: 
  * Damage over time spells - eg Acid Arrow - can be done when the original effect creator has been destroyed (currently Acid Arrow fails when the object creating it is removed from the game). It also simplifies it by the ability to have the same script the applied and inteval scripts.
  * Removal of tied-in but separate spell effects, for instance currently Aid will apply temporary HP plus some bonuses to attack - and if one is removed the other isn't automatically. This can remove shared effects in sOnRemovedScript
  * Having effects tied to the object it is applied to outside the context of having a Spell ID (easier than using ExecuteScript or AssignCommand).
  * More complex effect handling when an effect is removed, for instance applying a secondary effect. EG: If your Stoneskin "runs out" and is tied to an effect linked with this, the removal script could apply a new effect straight away such as healing or some other buff (albeit not tied to a spell ID if that matters).

There are some caveats to the effect: 
  * The scripts run will not have a Spell ID attached so cannot be used with the ResistSpell function. Nor will effects created within this script return a valid spell Id for functions such as GetHasSpellEffect. You could still test saving throws from the original effect creator however it won't be counted as a spell thus you'd lose bonus saving throws vs. spells.
  * If effects are created in the scripts they originate from OBJECT_SELF by default, which is what the object is applied to. Use GetEffectCreator(GetLastRunScriptEffect()); to use AssignCommand if you want the effects to come from the original creator (for instance when dealing damage and you want the original caster to see what damage is applied).

It is worth noting you cannot determine in the sOnRemovedScript how the effect has been removed, for instance you cannot capture if it was from dispel magic - however you could script in some hooks into some scripts to sort this (a local variable check for instance set temporarily in the dispel magic scripts; this would only ignore the Holy Avenger item property). 
### Interactions When Logged Out
As with all effects, the duration of an effect ticks down even when logged out of a server. This means when joining a server if an effect has already expired, the sOnRemovedScript fires when the effects are checked (and essentially "re-applied"), in this event order: 
  1. OnAcquireItem for each item in the inventory (including those equipped)
  2. OnPlayerEquipItem for any item is equipped 
     * (Repeat 1 for each item in inventory)
  3. OnClientEnter
  4. Removal of expired effects, eg will run EffectRunScript sOnRemovedScript script
  5. OnEnter - Order: Triggers, Area of Effects then the Area they are in.

There will be *no* counts of sOnIntervalScript being called (eg; more applications of Acid Arrow) so you can either deal with this in the sOnRemovedScript itself (apply all of them at once for instance, although determining what removed the effect is difficult, so some interaction with other events is needed) or just ignore it and let bygones be bygones. 
### Effect Breakdown
See EffectRegenerate for some notes on a similar timed interval effect. One helpful thing about this is in the script you can check for things like, say, being in a state of dying - which EffectRegenerate just ignores - meaning if you're using EffectHitPointChangeWhenDying they stay "dying" forever. You could use this to replace EffectRegenerate and take into account these situations. 
The way the effect works is that sOnAppliedScript is fired *instantly* as part of the script context. Mind this if the script perhaps will run any GetFirstObjectInShape or similar loops since it will upset any object loops in the parent script. This shows how it works: 
// Main scriptvoid main(){ effect eRunScript = EffectRunScript("applied"); SendMessageToPC(OBJECT_SELF, "Before applying EffectRunScript"); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eRunScript, OBJECT_SELF, 30.0); SendMessageToPC(OBJECT_SELF, "After applying EffectRunScript");}// "applied.nss" filevoid main(){ SendMessageToPC(OBJECT_SELF, "EffectRunScript sOnAppliedScript run");}
Outputs: 
> Before applying EffectRunScript 
> EffectRunScript sOnAppliedScript run 
> After applying EffectRunScript 
The other two scripts will run depending on the conditions of the time remaining and the interval called, for instance: 
  * If fInterval is 1.0 and the duration applied is for 6.0 seconds it will go: 
    * 0.0: sOnAppliedScript
    * 1.0, 2.0, 3.0, 4.0, 5.0: sOnIntervalScript
    * 6.0: sOnRemovedScript
  * If fInterval is 1.0 and the duration applied is for 6.1 seconds it will go: 
    * 0.0: sOnAppliedScript
    * 1.0, 2.0, 3.0, 4.0, 5.0, 6.0: sOnIntervalScript
    * 6.1: sOnRemovedScript

This means be careful on your timing if you want, for instance, Acid Arrow to apply damage for 3 rounds you'd want to end the effect slightly longer than 3 rounds duration, or use the sOnRemovedScript to fire a final instance. 
The removal sOnRemovedScript script will still have the effect be valid _but only for that script instance_ (you could check the duration remaining for instance - if more than 0 it'll be removed from a script or dispel magic). If you use RemoveEffect and remove the effect itself it will, thankfully, not recursively call sOnRemovedScript again. 
Due to how RemoveEffect and EffectDispelMagicAll / EffectDispelMagicBest operates, any sOnRemovedScript instances will not run immediately but fire as new script calls just after the script calling those functions runs (similar to a SignalEvent call with 0.0 time). 
Note that if the target object is destroyed with DestroyObject or some other method the sOnRemovedScript is **not** run, so do not rely on it to always run if you use it for plot reasons (for instance the default Dismissal spell uses DestroyObject). 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger | -  | 0 | fInterval * 1000 | The interval amount in milliseconds (thus 3.0 becomes 3000)   
1 | Unknown | No value seems to be stored here, or if there is one not sure what it is.   
2 | Day Effect Applied | Internal "day" record when the effect was first applied, then updated every time healing is done to keep track of "last time fired"   
3 | Millisecond Effect Applied | The millisecond the effect was applied, then updated every time healing is done to keep track of "last time fired"   
GetEffectFloat  
0 | fInterval | The interval in seconds, must be >0.0f if an interval script is set. Very low values may have an adverse effect on performance.   
GetEffectString  
0 | sData | An optional string of data saved in the effect   
1 | sOnAppliedScript | An optional script to execute when the effect is applied.   
2 | sOnRemovedScript | An optional script to execute when the effect is removed.   
3 | sOnIntervalScript | An optional script to execute every fInterval seconds.   
### Version
This function was added in 1.84.8193.29 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed a server crash that could happen if a creature died during the EffectRunScript interval script. 
### Example
// Very simplified Acid Arrow style spell script, in this case we'll do Electric damagevoid main(){ // Spell target object oTarget = GetSpellTargetObject(); // Create the RunScript effect, 6.0 duration // We'll use the same script for all 3 events // The sData parameter we'll set to the damage type we want to use effect eScript = EffectRunScript("spell_arrow", "spell_arrow", "spell_arrow", 6.0, IntToString(DAMAGE_TYPE_ELECTRICAL)); // We make it extraordinary since it cannot be removed by dispel magic eScript = ExtraordinaryEffect(eScript); // Duration is caster level / 3, in rounds. Minimum 1 round. int nDuration = GetCasterLevel(OBJECT_SELF) / 3; if(nDuration < 1) nDuration = 1; float fDuration = RoundsToSeconds(nDuration) + 0.1; // Arrow effect and the delay for other effects effect eArrow = EffectVisualEffect(VFX_IMP_MIRV_ELECTRIC); float fDist = GetDistanceBetween(OBJECT_SELF, oTarget); float fDelay = fDist/(3.0 * log(fDist) + 2.0); // Apply arrow ApplyEffectToObject(DURATION_TYPE_INSTANT, eArrow, oTarget); // Reputation check if((oTarget)) { //Fire cast spell at event for the specified target SignalEvent(oTarget, EventSpellCastAt(OBJECT_SELF, GetSpellId())); // Touch Attack to hit if(TouchAttackRanged(oTarget, TRUE)) { // Apply script effect after a delay DelayCommand(fDelay, ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eScript, oTarget, fDuration)); } }}
The spell_arrow script for the above: 
// Spell Arrow scriptvoid ApplyDamage(object oTarget, int nType, int nDamage){ ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDamage(nDamage, nType), oTarget);}void main(){ // Get the event type int nEvent = GetLastRunScriptEffectScriptType(); // Get original effect effect eOriginal = GetLastRunScriptEffect(); // Get creator object oCaster = GetEffectCreator(eOriginal); // Get damage type from the value stored in sData int nDamageType = StringToInt(GetEffectString(eOriginal, 0)); // Target is OBJECT_SELF, needed for AssignCommand later object oTarget = OBJECT_SELF; // We apply damage on the start and interval scripts switch(nEvent) { case RUNSCRIPT_EFFECT_SCRIPT_TYPE_ON_APPLIED: case RUNSCRIPT_EFFECT_SCRIPT_TYPE_ON_INTERVAL: { // Apply damage int nDamage = d6(2); int nVFX; // Damage type determines VFX and type switch(nDamageType) { case DAMAGE_TYPE_ACID: nVFX = VFX_IMP_ACID_S; break; case DAMAGE_TYPE_COLD: nVFX = VFX_IMP_FROST_S; break; case DAMAGE_TYPE_ELECTRICAL: nVFX = VFX_IMP_LIGHTNING_S; break; case DAMAGE_TYPE_FIRE: nVFX = VFX_IMP_FLAME_S; break; case DAMAGE_TYPE_SONIC: nVFX = VFX_IMP_SONIC; break; default: { // Error case return; } break; } effect eVis = EffectVisualEffect(nVFX); ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); AssignCommand(oCaster, ApplyDamage(oTarget, nDamageType, nDamage)); } break; case RUNSCRIPT_EFFECT_SCRIPT_TYPE_ON_REMOVED: { // Cessate effect eCessate = EffectVisualEffect(VFX_DUR_CESSATE_NEGATIVE); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eCessate, oTarget, 0.1); } break; }}
### See Also
functions:  |  GetLastRunScriptEffect GetLastRunScriptEffectScriptType
