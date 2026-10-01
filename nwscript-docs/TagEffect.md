<!-- Source: https://nwnlexicon.com/index.php?title=TagEffect&amp;action=history -->

# TagEffect(effect, string)

Tags the effect with the provided string. 
effect TagEffect( effect eEffect, string sNewTag);
### Parameters 

eEffect
    The effect object to tag. 

sNewTag
    A string to tag the effect object with.
### Description
Tags the effect with the provided string. Any other tags in the link will be overwritten. 
Unlike object tags (which can be set with SetTag) you can have pretty much any text in an effect tag, so can be potentially used as storage for lots of information, and is easily readable with JSON functions. Noting of course you can't change this data once it's set at effect application. This is inefficient for large linked effects since it is copied for each one (and also saved to save games) so referencing a variable instead or using GetEffectLinkId to identify a variable would be potentially more efficient if you're storing a lot of data (although of course this won't be automatically cleared up on removal of the effect). 
Also unlike objects there is no equivalent to GetObjectByTag in respect to effect tags. 
### Remarks
This function applies in a similar way to other Effect options such as SupernaturalEffect in that it does not tag eEffect passed in, but generates a new effect-with-tag "object" which must be assigned to a variable or applied. 
Also similar to the effect options Magical/Supernatural/Extraordinary, only the newest tag will persist for any effect. 
You need to apply this on the final effect created from EffectLinkEffects, any previous tags (or other flags such as supernatural) are lost when effects are combined. This applies the tag to every effect which is linked together. 
This is used in conjuction with GetEffectTag to uniquely identify effects, such as to remove effects created by a specific non-spell interaction (see example below). 
Note again that if the effect has already been applied, this will not tag that effect. The newly created, tagged effect will need to be applied to the Object/Location (presumably after removing the previous effect). 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
// Applying a supernatural effect 'permanently' decreasing entering PC's strength by 1.// Use the tag "TotallyUnique" to make this Strength decrease separate from others in effect.void main(){ object oPC=GetEnteringObject(); if((oPC)) return; effect eBad=EffectAbilityDecrease(ABILITY_STRENGTH, 1); eBad=SupernaturalEffect(eBad); eBad=TagEffect(eBad, "TotallyUnique"); ApplyEffectToObject(DURATION_TYPE_PERMANENT, eBad, oPC);}// When the PC leaves we want to remove the above effect, but leave other strength decreases intact.// Instead of checking for effect type, simply check for the effect tag.void main(){ object oPC=GetExitingObject(); if((oPC)) return; effect eEffect = GetFirstEffect(oPC); while(GetIsEffectValid(eEffect)) { if(GetEffectTag(eEffect) == "TotallyUnique") RemoveEffect(oPC, eEffect); eEffect = GetNextEffect(oPC); }}
// Applying two linked effects to an entering object, that are removed at once from an exiting object like above.// This is useful for applying a related visualvoid main(){ object oPC=GetEnteringObject(); if((oPC)) return; effect eAC = EffectACIncrease(10); effect eDur = EffectVisualEffect(VFX_DUR_GHOSTLY_VISAGE); effect eLink = EffectLinkEffects(eAC, eDur); // Always tag or make supernatural AFTER the linking is done eLink = SupernaturalEffect(eLink); eLink = TagEffect(eLink, "AC_BUFF"); // Apply the effect ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, oPC);}// When the PC leaves we want to remove the above effect, but leave other effects unaffected.// You could also just remove one of the two applied and tagged effects, it will automatically remove the othervoid main(){ object oPC=GetExitingObject(); if((oPC)) return; effect eEffect = GetFirstEffect(oPC); while(GetIsEffectValid(eEffect)) { if(GetEffectTag(eEffect) == "AC_BUFF") RemoveEffect(oPC, eEffect); eEffect = GetNextEffect(oPC); }}
### See Also
functions:  | GetEffectTag()
