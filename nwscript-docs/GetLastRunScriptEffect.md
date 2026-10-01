<!-- Source: https://nwnlexicon.com/index.php?title=GetLastRunScriptEffect&amp;action=history -->

# GetLastRunScriptEffect()

Get the effect that last triggered an EffectRunScript() script. 
effect GetLastRunScriptEffect();
#### Description
Get the effect that last triggered an EffectRunScript() script. 
Note: This can be used to get the creator or tag, among others, of the EffectRunScript() in one of its scripts. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT when called outside of an EffectRunScript() script. 
Note that in the RUNSCRIPT_EFFECT_SCRIPT_TYPE_ON_APPLIED event, that the effect GetLastRunScriptEffect has not yet _really_ been applied (it won't appear in a check of effects using GetFirstEffect) so some effect checking functions like GetEffectDurationRemaining won't work. 
#### Remarks
This returns a valid effect on the sOnRemovedScript (and removing it via a RemoveEffect call doesn't fire the script again). 
Use this to correctly assign who is applying further effects (for instance damage), or any number of other things such as getting the effect tag, the effect sData component etc. 
Be careful when testing the validity of it with GetIsEffectValid - the sOnRemovedScript by nature will have this return invalid since by that point the effect has been "unexposed" to scripts - but GetEffectType will correctly inform you it is EFFECT_TYPE_RUNSCRIPT (85) instead of -1 so this is a better test. 
#### Version
This function was added in 1.84.8193.29 of NWN:EE. 
#### Example
See EffectRunScript for a full example. 
#### See Also
functions:  |  EffectRunScript GetLastRunScriptEffectScriptType
