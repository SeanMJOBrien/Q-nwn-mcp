<!-- Source: https://nwnlexicon.com/index.php/ActionCloseDoor -->

# ActionCloseDoor(object)
An action that causes an object to close a door. 
void ActionCloseDoor( object oDoor);

### Parameters 

oDoor
    The door that will be closed.
### Description
Causes the calling object to close oDoor. If the target is a mobile creature, it will animate running to oDoor, reach out, and close it. 
This same function can be attached to a door object to have it close itself. (oDoor = OBJECT_SELF) 
### Remarks
When the door is already closed, the OnClose event is still fired. 
### Known Bugs
This action isn't always instant in some multiplayer modules and might be delayed. As an alternative, you can use PlayAnimation to close door which is always instant (not an action). 
### Version
1.61 
### Example
// From David Gaider's scripting FAQ and tutorial:// Set in a door's OnHeartbeat script, this will cause// it to close and lock itself at dusk and unlock itself at dawnvoid main(){ if (GetIsDusk() && GetIsOpen(OBJECT_SELF)) { ActionCloseDoor(OBJECT_SELF); // SetLocked is set in an ActionDoCommand because we // want it to be in the door's queue... we want the // ActionCloseDoor to be completed before locking the // door. ActionDoCommand(SetLocked(OBJECT_SELF, TRUE)); } else if (GetIsDawn() && GetLocked(OBJECT_SELF)) { SetLocked(OBJECT_SELF, FALSE); }}
### See Also
functions:  | GetBlockingDoor
