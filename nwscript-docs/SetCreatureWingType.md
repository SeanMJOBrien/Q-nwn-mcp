<!-- Source: https://nwnlexicon.com/index.php/SetCreatureWingType -->

# SetCreatureWingType

# SetCreatureWingType(int, object)
Sets the wing type of the creature specified. 
void SetCreatureWingType( int nWingType, object oCreature = OBJECT_SELF);
#### Parameters
_nWingType_
 CREATURE_WING_TYPE_* 
_oCreature_
The creature to change the wing type for. (Default: OBJECT_SELF) 
#### Description
Sets the wing type of the creature specified.Note: Only two creature model types will support wings. The model type for the part based (playable races) 'P' and model type 'W' in appearance.2da 
#### Version
1.67 
#### See Also
functions:  |   SetCreatureTailType   

constants:  |   CREATURE_WING_TYPE_*
