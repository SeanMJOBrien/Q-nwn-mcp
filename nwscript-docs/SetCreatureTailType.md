<!-- Source: https://nwnlexicon.com/index.php/SetCreatureTailType -->

# SetCreatureTailType

# SetCreatureTailType(int, object)
Sets the tail type of the creature specified. 
void SetCreatureTailType( int nTailType, object oCreature = OBJECT_SELF);
#### Parameters
_nTailType_
 CREATURE_TAIL_TYPE_* 
_oCreature_
The creature to change the tail type for. 
#### Description
Sets the tail type of the creature specified.Note: Only two creature model types will support tails. The model type for the part based (playable) races 'P' and model type 'T' in appearance.2da 
#### Version
1.67 
#### See Also
functions:  |   SetCreatureWingType   

constants:  |   CREATURE_TAIL_TYPE_*
