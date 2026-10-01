<!-- Source: https://nwnlexicon.com/index.php/SetFootstepType -->

# SetFootstepType(int, object)
Sets the footstep type of the creature specified. 
void SetFootstepType( int nFootstepType, object oCreature = OBJECT_SELF);
#### Parameters 

nFootstepType
     FOOTSTEP_TYPE_* . 

oCreature
    The creature to change the footstep sound for.
#### Description
Sets the footstep type of the creature specified. 
Changing a creature's footstep type will change the sound that its feet make whenever the creature takes a step. 
By default a creature's footsteps are determined by the appearance type of the creature as in appearance.2da 
SetFootstepType allows you to make a creature use a different footstep type than it would use by default for its given appearance. 
It appears the default value, -1, is valid for nFootstepType and appears to be the games way of saying "Not set", therefore would be a potentially better value to set when resetting it (instead of FOOTSTEP_TYPE_DEFAULT) since it will change appropriately when using SetCreatureAppearanceType and/or EffectPolymorph. 
#### Version
1.66 
#### See Also
functions:  |  GetFootstepType  

constants:  |   FOOTSTEP_TYPE_*
