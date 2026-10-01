<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectFloat&amp;action=history -->

# GetEffectFloat(effect, int)
Retrieves an float parameter of an effect. 
float GetEffectInteger( effect eEffect, int nIndex);
#### Parameters 

eEffect
    The effect to check a parameter of 

nIndex
    The index of the parameter. Valid values 0 through 3.
#### Description
Get the float parameter of eEffect at nIndex. 
nIndex bounds: 0 >= nIndex < 4. 
Returns: the value or 0.0f on error/when not set. 
#### Remarks
This digs into an effect to get some values that are currently set on it. For instance EffectBeam you can see what the scale of the beam is. These numbers may dynamically change during runtime. 
See the other types of effect values with GetEffectInteger, GetEffectString, GetEffectObject and GetEffectVector. 
The experimentation of this function has been documented on the lexicon; you can find GetEffectFloat information on the Effect Constructor Functions. 
You can get float values from these effects: 
  * EffectAreaOfEffect (sort of - usually not accessible)
  * EffectBeam
  * EffectDisappearAppear
  * EffectHitPointChangeWhenDying
  * EffectSummonCreature
  * EffectVisualEffect

#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
// Execute this script on someone to find out what the EffectHitPointChangeWhenDying amount isvoid main(){ object oCreature = OBJECT_SELF; effect eEffect = GetFirstEffect(oCreature); while(GetIsEffectValid(eEffect)) { if(GetEffectType(eEffect) == EFFECT_TYPE_BEAM) { float fScale = GetEffectFloat(eEffect, 0); SendMessageToPC(oCreature, "Beam found. Scale: " + FloatToString(fScale)); } eEffect = GetNextEffect(oCreature); }}
### See Also
functions:  |  Effect Constructor Functions GetEffectInteger, GetEffectString, GetEffectObject, GetEffectVector  

constants:  |  Various constants, see Effect Constructors.
