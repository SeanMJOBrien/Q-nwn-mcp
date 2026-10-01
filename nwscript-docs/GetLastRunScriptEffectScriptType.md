<!-- Source: https://nwnlexicon.com/index.php/GetLastRunScriptEffectScriptType -->

# GetLastRunScriptEffectScriptType()

Get the script type (RUNSCRIPT_EFFECT_SCRIPT_TYPE_*) of the last triggered EffectRunScript() script. 
int GetLastRunScriptEffectScriptType();
#### Description
Get the script type (RUNSCRIPT_EFFECT_SCRIPT_TYPE_*) of the last triggered EffectRunScript() script. 
Returns 0 when called outside of an EffectRunScript() script. 
#### Remarks
This can be used to have the same script be reused for each of the parameters of EffectRunScript. 
Note that in the RUNSCRIPT_EFFECT_SCRIPT_TYPE_ON_APPLIED event, that the effect GetLastRunScriptEffect has not yet _really_ been applied (it won't appear in a check of effects using GetFirstEffect) so some effect checking functions like GetEffectDurationRemaining won't work. 
#### Version
This function was added in 1.84.8193.29 of NWN:EE. 
#### Example
See EffectRunScript for a full example. 
#### See Also
functions:  |  EffectRunScript GetLastRunScriptEffect  

constants:  |  RUNSCRIPT_EFFECT_SCRIPT_TYPE
