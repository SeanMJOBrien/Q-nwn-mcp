<!-- Source: https://nwnlexicon.com/index.php/GetEffectObject -->

# GetEffectObject(effect, int)
Retrieves an object parameter of an effect. 
object GetEffectObject( effect eEffect, int nIndex);
#### Parameters 

eEffect
    The effect to check a parameter of 

nIndex
    The index of the parameter. Valid values 0 through 3.
#### Description
Get the float parameter of eEffect at nIndex. 
nIndex bounds: 0 >= nIndex < 4. 
Returns: the value or OBJECT_INVALID on error/when not set. 
#### Remarks
This digs into an effect to get some values that are currently set on it. For instance EffectSwarm you can figure out what the current summoned creature tied to the effect is. These objects may dynamically change during runtime. 
See the other types of effect values with GetEffectInteger, GetEffectFloat, GetEffectString and GetEffectVector. 
The experimentation of this function has been documented on the lexicon; you can find GetEffectObject information on the Effect Constructor Functions. 
The functions this applies to are: 
  * EffectAreaOfEffect (when applied to a creature)
  * EffectBeam
  * EffectDisappearAppear
  * EffectSummonCreature
  * EffectSwarm

#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
// OnUsed event to tell the person their EffectSwarm summons name.void main(){ object oUser = GetLastUsedBy(); effect eEffect = GetFirstEffect(oUser); while(GetIsEffectValid(eEffect)) { if(GetEffectType(eEffect) == EFFECT_TYPE_SWARM) { object oSummon = GetEffectObject(eEffect, 0); SendMessageToPC(oUser, "Swarm effect found. Current summoned creature is called: " + [GetName(oSummon) + "]"); } eEffect = GetNextEffect(oUser); }}
#### See Also
functions:  |  Effect Constructor Fucntions GetEffectInteger, GetEffectFloat, GetEffectString, GetEffectVector  

constants:  |  Various constants, see Effect Constructors.
