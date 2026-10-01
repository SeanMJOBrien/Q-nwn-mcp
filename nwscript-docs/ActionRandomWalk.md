<!-- Source: https://nwnlexicon.com/index.php?title=ActionRandomWalk&amp;action=history -->

# ActionRandomWalk()
Causes the subject to walk to a random location close to itself. 
void ActionRandomWalk();

### Description
The action subject will generate a random location near its current location and pathfind to it. This behavior will continue every so often until cancelled with a ClearAllActions() command. No return value, but if an error occurs the log file will contain "ActionRandomWalk failed." 
### Remarks
ActionRandomWalk never ends, meaning it's necessary to call ClearAllActions() in order to stop it. The subject will not stray far from the location where it was when this function is called. 
### Version
1.61 
### Example
// This simple script could go in an NPC's OnSpawn script.// The caller will continue walking randomly until ClearAllActions() is called.void main(){ ActionRandomWalk();}
### See Also
functions:  | WalkWayPoints
