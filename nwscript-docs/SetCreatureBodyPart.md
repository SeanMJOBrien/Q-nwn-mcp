<!-- Source: https://nwnlexicon.com/index.php?title=SetCreatureBodyPart&amp;action=history -->

# SetCreatureBodyPart(int, int, object)
Sets the body part model to be used on the creature specified. 
void SetCreatureBodyPart( int nPart, int nModelNumber, object oCreature = OBJECT_SELF);
#### Parameters 

nPart
     CREATURE_PART_*  

nModelNumber
    The model ID number. For some parts this can be the  CREATURE_MODEL_TYPE_*  constants, otherwise see the description. 

oCreature
    The creature to change the body part for. (Default: OBJECT_SELF)
#### Description
Sets the body part model to be used on the creature specified. 
Only part based creature appearance types are supported. i.e. The model types for the playable races ('P') in the appearance.2da. 
The model names for parts need to be in the following format: p<m/f><race letter><phenotype>_<body part><model number>.mdl 
You can now check what ones really exist with ResManGetAliasFor, eg; ResManGetAliasFor("pmh0_head003", RESTYPE_MDL); will check if the Male, Human, Normal phenotype head 003 exists. Note however that the game still uses 2da files to validate non-head part pieces (parts_XXX.2da files) 
For heads you have a variety of heads starting from 001 (although 000 is valid to use, ie "no model"). 
For non-head pieces usually there are 2 variants, with a 3rd added for the Pale Master: 
  * CREATURE_MODEL_TYPE_SKIN is not for use on shoulders, pelvis.
  * CREATURE_MODEL_TYPE_TATTOO is for body parts that support tattoos, i.e. not heads/feet/hands.
  * CREATURE_MODEL_TYPE_UNDEAD is the undead models that only exist for the right arm parts.

#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetCreatureBodyPart() erroneously modifying equipped armor. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetCreatureBodyPart() changes only being seen by a single client in multiplayer. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetCreatureBodyPart() failing to update some armor appearances if no skinmesh was used. 
#### See Also
functions:  |  GetCreatureBodyPart ResManGetAliasFor  

constants:  |   CREATURE_PART_*
