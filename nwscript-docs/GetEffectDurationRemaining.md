<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectDurationRemaining&amp;action=history -->

# GetEffectDurationRemaining(effect)

Returns the remaining duration of the effect in seconds. 
int GetEffectDurationRemaining( effect eEffect);
### Parameters 

eEffect
    The effect object to get the remaining duration of.
### Description
Returns the remaining duration of the effect in seconds. Returns 0 if the duration type of the effect is not DURATION_TYPE_TEMPORARY. 
### Remarks
You can compare this to GetEffectDuration to see how long the effect was instantiated as, thus make a comparison that is for instance half over. 
While not advisable, you run a check constantly (eg; in a heartbeat) that could use this to say a spell is ending soon. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
This function was updated in 1.85.8193.30 of NWN:EE. Game/VM: Fixed Get*DurationRemaining returning the wrong value due to time overflow. 
### Example
// Look and see if SPELL_STONESKIN is past half it's remaining time on OBJECT_SELFvoid main(){ int nEffectDuration, nEffectDurationRemaining, nSpellID; object oCreator; // Report on all effects effect eEffect = GetFirstEffect(OBJECT_SELF); while(GetIsEffectValid(eEffect)) { // Stoneskin lasts 1 hour/level if(GetEffectSpellId(eEffect) == SPELL_STONESKIN) { nEffectDuration = GetEffectDuration(eEffect); nEffectDurationRemaining = GetEffectDurationRemaining(eEffect); if(nEffectDurationRemaining < nEffectDuration / 2) { SpeakString("Stoneskin is at least half depleted in duration"); } } // Get next effect eEffect = GetNextEffect(OBJECT_SELF); }}
### See Also
functions:  | GetEffectDuration(), GetEffectDurationType(), GetEffectCasterLevel()
