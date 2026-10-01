<!-- Source: https://nwnlexicon.com/index.php/MoveToNewLocation -->

# MoveToNewLocation

# MoveToNewLocation(location, object)
Tells the object to move to a new location 
void MoveToNewLocation( location lNewLocation = none, object oTarget = OBJECT_SELF);
#### Parameters
_lNewLocation_
Location to Move To (Default: none) 
_oTarget_
Object to Move (Default: OBJECT_SELF) 
#### Description
This is a convenience function that places two commands in the target objects queue using two AssignCommand calls. The first wraps ActionMoveToLocation(lNewLocation, FALSE). The second wraps ActionDoCommand(SetFacing(GetFacingFromLocation(lNewLocation)) These two commands effectively command the target to move to the new location, then instructs the target to face the correct way once they get there. The default target is OBJECT_SELF. Note that the restrictions to AssignCommand, ActionMoveToLocation, and SetFacing still apply. Calls void SetFacing(float fFacing) void ActionDoCommand(action aActionToDo) float GetFacingFromLocation(location loc):float void AssignCommand(object oTarget, action aActionToDo) void ActionMoveToLocation(location lNewLocation, int bRun) 
#### Requirements
#include " x0_i0_position " 
#### Version
1.61 
#### See Also
functions:  |   SetFacing
