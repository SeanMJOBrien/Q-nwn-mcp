<!-- Source: https://nwnlexicon.com/index.php/ActionForceMoveToObject -->

# ActionForceMoveToObject(object, int, float, float)
Attempts to move an NPC to a certain distance of a target object even if a clear path doesn't exist. 
void ActionForceMoveToObject( object oMoveTo, int bRun = FALSE, float fRange = 1.0f, float fTimeout = 30.0f);

### Parameters 

oMoveTo
    Target object to move to. 

bRun
    If TRUE, the subject will run to oMoveTo. (Default: FALSE) 

fRange
    The range from oMoveTo to stop at. (Default: 1.0f) 

fTimeout
    The amount of time to search for path before jumping to the object (as in ActionJumpToObject()). (Default: 30.0f)
### Description
The action subject will attempt to move to within fRange meters of oMoveTo. The creature will try for fTimeout seconds to reach the waypoint and will teleport to the location no matter if it found a path in the meantime or not. 
No return value, but if an error occurs the log file will contain "MoveToPoint failed." 
### Remarks
Move to object functions (ActionForceMoveToObject() and ActionMoveToObject()) actually do path finding, unlike their move to location (ActionForceMoveToLocation() and ActionMoveToLocation()) counterparts. 
### Known Bugs
If the target is a transition door, the result is unpredictable. Use a waypoint instead. 
### Version
1.61 
### See Also
functions:  | ActionMoveToObject
