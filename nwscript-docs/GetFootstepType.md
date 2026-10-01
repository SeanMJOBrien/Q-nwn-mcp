<!-- Source: https://nwnlexicon.com/index.php/GetFootstepType -->

# GetFootstepType(object)
Returns the  FOOTSTEP_TYPE_*  of the creature specified. 
int GetFootstepType( object oCreature = OBJECT_SELF);
#### Parameters 

oCreature
    The creature that we are interested in.
#### Description
Returns the  FOOTSTEP_TYPE_*  of the creature specified. 
Note that while SetFootstepType can use -1 to reset to "use creature appearance" this function doesn't ever return -1 but always looks it up in appearance.2da. You can test the "true" value by creating an in-memory copy using ObjectToJson and looking up the FootstepType field is easiest. See Creature JSON for more information. 
#### Version
1.66 
#### See Also
functions:  |  SetFootstepType
