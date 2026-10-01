<!-- Source: https://nwnlexicon.com/index.php/ActionUnlockObject -->

# ActionUnlockObject(object)

Causes a creature to unlock a door or other locked object. 
void ActionUnlockObject( object oTarget);

### Parameters 

oTarget
    Door or placeable object that will be the target of the unlock attempt.
### Description
The action subject will unlock oTarget, which can be a door or a placeable object. ActionUnlockObject represents an object's use of the Open Lock skill, and is therefore not applicable to placeables, triggers, or doors themselves. 
### Remarks
Used in the script of a creature (or assigned to a creature), it will move that creature to the door and use its Open Lock skill to attempt to unlock the door (or placeable). 
### Known Bugs
Doors cannot lock or unlock themselves using this command, but trying to make them do so will not crash the game as it used to. This is not really a bug, since doors cannot use the Open Lock skill, which is what this action involves. You can use ActionDoCommand(SetLocked(OBJECT_SELF, FALSE)); in a door's script as a substitute for ActionUnlockObject(). 
### Version
1.30 
### Example
// In this example OnBlocked script, the NPC will unlock the door he ran into.void main(){ object oDoor = GetBlockingDoor(); // The blocking door can be a creature, too! if (GetObjectType(oDoor) == OBJECT_TYPE_DOOR) ActionUnlockObject(oDoor);}
### See Also
functions:  | ActionLockObject, SetLocked
