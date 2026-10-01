<!-- Source: https://nwnlexicon.com/index.php/GetEffectDurationType -->

# GetEffectDurationType

# GetEffectDurationType(effect)
Gets the constant that defines the type of effect in eEffect. 
int GetEffectDurationType( effect eEffect);
#### Parameters
_eEffect_
The effect you wish to compare or examine. 
#### Description
Returns the duration type (DURATION_TYPE_*, either instant, permanent or temporary) of eEffect. If eEffect is not valid, it will return -1. 
#### Remarks
You must first create and place the effect you wish to examine into a variable before calling this function. Used mostly to remove effects of a certain duration type while looping through effects on an object. Not often used but may come in handy if you need to remove all temporary effects without touching the permanent effects, such as when a player walks into a null magic zone. 
#### Version
1.22 
#### Example
effect eEffect = GetFirstEffect(oTarget);while (GetIsValidEffect(eEffect)){ if (GetEffectDurationType(eEffect) == DURATION_TYPE_TEMPORARY) { RemoveEffect(oTarget, eEffect); } eEffect = GetNextEffect(oTarget);}
#### See Also
functions:  |   RemoveEffect   

constants:  |   DURATION_TYPE_* Constants
