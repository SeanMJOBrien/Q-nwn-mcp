<!-- Source: https://nwnlexicon.com/index.php/SetLocked -->

# SetLocked

# SetLocked(object, int)
Locks or unlocks a door or placeable. 
void SetLocked( object oTarget, int bLocked);
#### Parameters
_oTarget_
The door or placeable to lock 
_bLocked_
TRUE to lock, FALSE to unlock. 
#### Description
Used by objects or creatures to set the locked status of an object or placeable without checking the Open Locks skill. 
Note that DM Force Lock does the same thing as this. You can actually lock doors which cannot be normally re-locked, but it is not recommended. 
#### Remarks
Alternatively, ActionLockObject and ActionUnlockObject can be used by creatures so appropriate skill checks are made. Make sure, as well, that your door has the 're-lockable' box checked. 
Of course, you can also lock an open door. 
When the object is already (un)locked, the On(Un)locked event is still fired. 
#### Version
1.61 
#### Example
// Unlocked an object with the tag DOOR_TAGvoid main(){ object oDoor = GetObjectByTag("DOOR_TAG"); SetLocked(oDoor, FALSE);}
#### See Also
functions:  |   GetLastUnlocked
