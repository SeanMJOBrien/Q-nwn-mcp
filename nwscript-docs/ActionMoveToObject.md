<!-- Source: https://nwnlexicon.com/index.php?title=ActionMoveToObject&amp;action=history -->

# ActionMoveToObject(object, int, float)

Cause action subject to move to a certain distance of a target object. 
void ActionMoveToObject( object oTarget, int bRun = FALSE, float fRange = 1.0f);
### Parameters 

oTarget
    Object to move action subject to. 

bRun
    If TRUE, the action subject will run rather than walk. (Default: FALSE) 

fRange
    **This parameter is currently unused and the game assumes 0.0 for it.** What it should be is the desired distance, in meters, between the action subject and oTarget. (Default: 1.0f)
### Description
The action subject will move to oTarget to get as close as possible since fRange is ignored. 
If there is no path to oTarget, the function will do nothing. 
The function call waits for the subject to reach oTarget before executing further actions in the action queue. If an error occurs the log file will contain "ActionMoveToObject failed." 
### Remarks
Move to object functions (ActionForceMoveToObject() and ActionMoveToObject()) actually do path finding if the object targeted moves, unlike their move to location (ActionForceMoveToLocation() and ActionMoveToLocation()) counterparts. 
### Known Bugs
PCs ignore the value of bRun and always run to the target object. If you want a PC to walk rather than run, you must use ActionMoveToLocation() instead. 
fRange is ignored. This is now intentional since the default compiled value (1.0) differs from the games older used value (0.0) when the value was ignored. This broke some modules. Hopefully in the future a fRealRange parameter can be added so this functionality can be restored. 
### Version
This function was updated in 1.83.8193.23 of NWN:EE. Fixed fRange so it is always used properly. Previously it was ignored in many cases or pathfinding jumped to the final location/object meaning things kept getting stuck. It also had transitions fixed so moving to them properly transitioned through. 
This function was updated in 1.84.8193.29 of NWN:EE. fRange change reverted to fix some older modules (since default fRange is 1.0, not the 0.0 the game used). 
### Example
// This example OnPerception event will make the caller run to a perceived PC.// Could use this on a friendly dog, perhaps.void main(){ object oPC = GetLatPerceived(); // If this is a PC... if (GetIsPC(oPC)) ActionMoveToObject(oPC, TRUE);}
### See Also
functions:  | ActionMoveToLocation
