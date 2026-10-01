<!-- Source: https://nwnlexicon.com/index.php/GetCreatureWingType -->

# GetCreatureWingType

# GetCreatureWingType(object)
Returns the  CREATURE_WING_TYPE_*  of the creature specified. 
int GetCreatureWingType( object oCreature = OBJECT_SELF);
#### Parameters
_oCreature_
The creature you wish to examine. (Default: OBJECT_SELF) 
#### Description
Returns the  CREATURE_WING_TYPE_*  of the creature specified.Returns CREATURE_WING_TYPE_NONE if used on a non-creature object, if the creature has no wings, or if the creature can not have its wing type changed in the toolset. 
#### Version
1.67 
#### See Also
functions:  |   SetCreatureTailType   

constants:  |   CREATURE_WING_TYPE_*
