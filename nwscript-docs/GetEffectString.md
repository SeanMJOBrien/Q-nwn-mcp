<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectString&amp;action=history -->

# GetEffectString(effect, int)
Retrieves an string parameter of an effect. 
string GetEffectString( effect eEffect, int nIndex);
#### Parameters 

eEffect
    The effect to check a parameter of 

nIndex
    The index of the parameter. Valid values 0 through 5.
#### Description
Get the float parameter of eEffect at nIndex. 
nIndex bounds: 0 >= nIndex < 6. 
Returns: the value or "" on error/when not set. 
#### Remarks
This digs into an effect to get some values that are currently set on it. For instance EffectSwarm you can figure out what resrefs the effect is using. These strings may dynamically change during runtime. 
See the other types of effect values with GetEffectInteger, GetEffectFloat, GetEffectObject and GetEffectVector. 
The experimentation of this function has been documented on the lexicon; you can find GetEffectString information on the Effect Constructor Functions. 
The functions this applies to are: 
  * EffectAreaOfEffect (if applied to a creature only)
  * EffectSummonCreature
  * EffectSwarm

Note to retrieve the effects tag use GetEffectTag, not this function. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
// OnUsed event to tell the person their EffectSwarm resrefs.void main(){ object oUser = GetLastUsedBy(); effect eEffect = GetFirstEffect(oUser); while(GetIsEffectValid(eEffect)) { if(GetEffectType(eEffect) == EFFECT_TYPE_SWARM) { string sResRef1 = GetEffectString(eEffect, 0); string sResRef2 = GetEffectString(eEffect, 1); string sResRef3 = GetEffectString(eEffect, 2); string sResRef4 = GetEffectString(eEffect, 3); SendMessageToPC(oUser, "Swarm effect found. 1st ResRef: [" + sResRef1 + "] 2nd ResRef: [" + sResRef2 + "] 3rd ResRef: [" + sResRef3 + "] 4th ResRef: [" + sResRef4 + "]"); } eEffect = GetNextEffect(oUser); }}
#### See Also
functions:  |  Effect Constructor Fucntions GetEffectInteger, GetEffectFloat, GetEffectObject, GetEffectVector  

constants:  |  Various constants, see Effect Constructors.
