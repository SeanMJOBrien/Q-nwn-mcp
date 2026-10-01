<!-- Source: https://nwnlexicon.com/index.php/GetCreatureBodyPart -->

# GetCreatureBodyPart

# GetCreatureBodyPart(int, object)
Returns the model number being used for the body part and creature specified. 
int GetCreatureBodyPart( int nPart, object oCreature = OBJECT_SELF);
#### Parameters
_nPart_
 CREATURE_PART_* 
_oCreature_
The creature whose body part you wish to determine. 
#### Description
Returns the model number being used for the body part and creature specified.The model number returned is for the body part when the creature is not wearing armor (i.e. whether or not the creature is wearing armor does not affect the return value).Only works on part based creatures, which is typically restricted to the playable races (unless some new part based custom content has been added to the module).Returns CREATURE_PART_INVALID if used on a non-creature object, or if the creature does not use a part based model. 
Note: The CREATURE_PART_INVALID constant does not exist in nwscript.nss. The function will return -1 for invalid return values. 
#### Version
1.67 
#### See Also
functions:  |   SetCreatureBodyPart   

constants:  |   CREATURE_PART_*
