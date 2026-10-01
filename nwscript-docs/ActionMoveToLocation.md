<!-- Source: https://nwnlexicon.com/index.php/ActionMoveToLocation -->

# ActionMoveToLocation(location, int)

Moves an NPC to a location before executing further actions in the action queue. 
void ActionMoveToLocation( location locDestination, int bRun = FALSE);

### Parameters 

locDestination
    The object will move to this location. If the location is invalid or a path cannot be found to it, the command does nothing. 

bRun
    If TRUE, the action subject will run rather than walk (Default: FALSE)
### Description
The action subject will move to locDestination. The function call waits for the subject to reach locDestination before executing further actions in the action queue. If an error occurs the log file will contain "MoveToPoint failed." 
### Remarks
This function is designed for creatures (NPCs and PCs). You can only move placeable objects in NWN by copying or using EffectDisappearAppear. To cause a PC or NPC who is not the calling object to execute this command, use AssignCommand(). 
Move to location functions (ActionForceMoveToLocation() and ActionMoveToLocation()) seem to try to move to their destination in a straight line, unlike move to object functions (ActionForceMoveToObject(), ActionMoveToObject()) which actually do path finding. Furthermore, the move to location functions get interrupted very easily. If anything bumps or obstructs the moving object then the command is finished. 
### Known Bugs
This function ignores the commandable state of the creature given the action. Thus, the move to location action is added to the end of non-commandable creatures' action queues. 
### Version
1.61 
### Example
// Make the calling object walk to a waypointvoid main(){ object oWP = GetObjectByTag("my_waypoint"); location lDestination = GetLocation(oWP); ActionMoveToLocation(lDestination,FALSE);}
### See Also
functions:  | ActionForceMoveToLocation, ActionMoveToObject, MoveToNewLocation
