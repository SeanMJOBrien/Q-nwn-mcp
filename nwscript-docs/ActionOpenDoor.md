<!-- Source: https://nwnlexicon.com/index.php?title=ActionOpenDoor&amp;action=history -->

# ActionOpenDoor(object)
An action that will cause a creature to open a door. 
void ActionOpenDoor( object oDoor);

### Parameters 

oDoor
    The door that will be opened.
### Description
Cause the action subject to open oDoor. If the subject of an ActionOpenDoor is the door, either through AssignCommand or in a door's script, then the door will open itself. However, if ActionOpenDoor is used in the script of a creature, that action will cause the creature to move to the door and open it, as long as it is not locked. 
### Remarks
DoDoorAction(oDoor, DOOR_ACTION_OPEN) can be used as an alternative to add the action on top of any actions currently running, and is recommended for a creature's OnBlocked event. 
When the door is already opened, the OnOpen event is still fired. 
### Known Bugs
This action isn't always instant in some multiplayer modules and might be delayed. As an alternative, you can use PlayAnimation to open door which is always instant (not an action). 
The toolset bug that made it impossible to create doors initially open no longer exists, and thus there's no need for the ActionOpenDoor workaround noted here previously. 
### Version
1.30 
### Example
// This script is for the OnEnter event for an area.// The script will command a door tagged "OPEN_DOOR"// to open itself.void main{ // Initialize objects. object oDoor = GetObjectByTag("OPEN_DOOR"); // Tell door to open itself. AssignCommand(oDoor, ActionOpenDoor(oDoor));}
### See Also
functions:  | DoDoorAction, SetLocked  

events:  | OnOpen
