<!-- Source: https://nwnlexicon.com/index.php/ActionForceMoveToLocation -->

# ActionForceMoveToLocation(location, int, float)
Attempts to move an NPC to a location. 
void ActionForceMoveToLocation( location locDestination, int bRun = FALSE, float fTimeout = 30.0f);

### Parameters 

locDestination
    The target destination to move to. 

bRun
    If TRUE, the subject will run to locDestination. (Default: FALSE) 

fTimeout
    Amount of time to search for a path before giving up. (Default: 30.0f)
### Description
The action subject will attempt to move to locDestination. If it cannot find a path to locDestination then it will continue to search for fTimeout seconds (DEFAULT: 30.0f) before giving up. 
No return value, but if an error occurs the log file will contain "MoveToPoint failed." If it is desired that the subject run to the location, bRun must be TRUE. 
This shouldn't be assigned to PCs - normally you want to assign a much better ActionMoveToLocation() which will be less intensive. 
### Remarks
Move to location functions (ActionForceMoveToLocation() and ActionMoveToLocation()) seem to try to move to their destination in a straight line, unlike move to object functions (ActionForceMoveToObject() and ActionMoveToObject()) which actually do path finding. Furthermore, the move to location functions get interrupted very easily. If anything bumps or obstructs the moving object then the command is finished. 
### Version
1.28 
### See Also
functions:  | ActionMoveToObject
