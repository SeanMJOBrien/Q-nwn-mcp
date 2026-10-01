<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectTag&amp;action=history -->

# GetEffectTag(effect)

Returns the string tag set for the provided effect. 
string GetEffectTag( effect eEffect);
### Parameters 

eEffect
    The effect object to get the tag from.
### Description
Returns the string tag set for the provided effect. If no tag has been set, returns an empty string. 
### Remarks
The returned string is that which was set using TagEffect during effect application. Useful in order to check whether an effect is the result of a specific interaction (which is not a spell and therefore GetEffectSpellId would not work).One such example might be applying a supernatural effect on being hit by a creature, which is normally undispellable, but allow a special potion to clear that effect without clearing all effects of the same type.The example below considers an undispellable effect from entering an area and removing the same effect on exiting. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
// Applying a supernatural effect 'permanently' decreasing entering PC's strength by 1.// Use the tag "TotallyUnique" to make this Strength decrease separate from others in effect.void main(){ object oPC=GetEnteringObject(); if((oPC)) return; effect eBad=EffectAbilityDecrease(ABILITY_STRENGTH, 1); eBad=SupernaturalEffect(eBad); eBad=TagEffect(eBad, "TotallyUnique"); ApplyEffectToObject(DURATION_TYPE_PERMANENT, eBad, oPC);}// When the PC leaves we want to remove the above effect, but leave other strength decreases intact.// Instead of checking for effect type, simply check for the effect tag.void main(){ object oPC=GetExitingObject(); if((oPC)) return; effect eEffect = GetFirstEffect(oPC); while(GetIsEffectValid(eEffect)) { if(GetEffectTag(eEffect) == "TotallyUnique") RemoveEffect(oPC, eEffect); eEffect = GetNextEffect(oPC); }}
// Applying two linked effects to an entering object, that are removed at once from an exiting object like above.// This is useful for applying a related visualvoid main(){ object oPC=GetEnteringObject(); if((oPC)) return; effect eAC = EffectACIncrease(10); effect eDur = EffectVisualEffect(VFX_DUR_GHOSTLY_VISAGE); effect eLink = EffectLinkEffects(eAC, eDur); // Always tag or make supernatural AFTER the linking is done eLink = SupernaturalEffect(eLink); eLink = TagEffect(eLink, "AC_BUFF"); // Apply the effect ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, oPC);}// When the PC leaves we want to remove the above effect, but leave other effects unaffected.// You could also just remove one of the two applied and tagged effects, it will automatically remove the othervoid main(){ object oPC=GetExitingObject(); if((oPC)) return; effect eEffect = GetFirstEffect(oPC); while(GetIsEffectValid(eEffect)) { if(GetEffectTag(eEffect) == "AC_BUFF") RemoveEffect(oPC, eEffect); eEffect = GetNextEffect(oPC); }}
### See Also
functions:  | TagEffect
