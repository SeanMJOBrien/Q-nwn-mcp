<!-- Source: https://nwnlexicon.com/index.php/ActionLockObject -->

# ActionLockObject(object)

An action that will cause a creature to lock a door or other unlocked object. 
void ActionLockObject( object oTarget);

### Parameters 

oTarget
    Door or placeable object that will be the target of the lock attempt.
### Description
The action subject will lock oTarget, which can be a door or a placeable object. Used in the script of a creature (or assigned to a creature), it will move that creature to the door and use its Open Locks skill to attempt to lock the door (or placeable). 
### Known Bugs
Doors cannot lock or unlock themselves using this command, but trying to make them do so will not crash the game, as it used to. You can use ActionDoCommand(SetLocked(OBJECT_SELF, FALSE)); in a door's script as a substitute for ActionUnlockObject(). Ensure that the door has the 're-lockable' property set. 
### Version
1.30 
### Example
// This example makes the calling object lock the nearest door.void main(){ // Get the nearest door to the caller. object oDoor = GetNearestObject(OBJECT_TYPE_DOOR); // Close the door, then lock it. ActionCloseDoor(oDoor); ActionLockObject(oDoor);}
### See Also
functions:  | SetLocked
