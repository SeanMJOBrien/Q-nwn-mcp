<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectVector&amp;action=history -->

# GetEffectVector(effect, int)
Retrieves an object parameter of an effect. 
vector GetEffectVector( effect eEffect, int nIndex);
#### Parameters 

eEffect
    The effect to check a parameter of 

nIndex
    The index of the parameter. Valid values 0 through 1.
#### Description
Get the float parameter of eEffect at nIndex. 
nIndex bounds: 0 >= nIndex < 2. 
Returns: the value or {0.0f, 0.0f, 0.0f} on error/when not set. 
#### Remarks
This digs into an effect to get some values that are currently set on it. For instance EffectVisualEffect you can check what the translation or rotation of the effect is. These vectors may dynamically change during runtime. 
See the other types of effect values with GetEffectInteger, GetEffectFloat, GetEffectString and GetEffectObject. 
The experimentation of this function has been documented on the lexicon; you can find GetEffectVector information on the Effect Constructor Functions. 
The functions this applies to are: 
  * EffectBeam
  * EffectVisualEffect

Some effects that set a "location" such as EffectDisappearAppear look at GetEffectFloat instead. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
// OnUsed event to tell the person their EffectVisualEffect translation information.void main(){ object oUser = GetLastUsedBy(); effect eEffect = GetFirstEffect(oUser); while(GetIsEffectValid(eEffect)) { if(GetEffectType(eEffect) == EFFECT_TYPE_VISUALEFFECT) { vector vTranslate = GetEffectVector(eEffect, 0); SendMessageToPC(oUser, "Visual effect found. Translation vector, x: " + [FloatToString(vTranslate.x) + "] y: " + [FloatToString(vTranslate.y) + "] z: " + [FloatToString(vTranslate.z) + "]"); } eEffect = GetNextEffect(oUser); }}
#### See Also
functions:  |  Effect Constructor Fucntions GetEffectInteger, GetEffectFloat, GetEffectString, GetEffectObject  

constants:  |  Various constants, see Effect Constructors.
