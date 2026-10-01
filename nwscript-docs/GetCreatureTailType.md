<!-- Source: https://nwnlexicon.com/index.php/GetCreatureTailType -->

# GetCreatureTailType

# GetCreatureTailType(object)
Returns the  CREATURE_TAIL_TYPE_*  of the creature specified. 
int GetCreatureTailType( object oCreature = OBJECT_SELF);
#### Parameters
_oCreature_
The creature you wish to examine. (Default: OBJECT_SELF) 
#### Description
Returns the  CREATURE_TAIL_TYPE_*  of the creature specified.Returns CREATURE_TAIL_TYPE_NONE if used on a non-creature object, if the creature has no Tail, or if the creature can not have its tail type changed in the toolset. 
#### Version
1.67 
#### See Also
functions:  |   SetCreatureWingType   

constants:  |   CREATURE_TAIL_TYPE_*
