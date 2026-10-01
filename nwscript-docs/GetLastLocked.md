<!-- Source: https://nwnlexicon.com/index.php/GetLastLocked -->

# GetLastLocked

# GetLastLocked()
Get the last object that locked the caller. 
object GetLastLocked();
#### Description
Returns the last object that locked the calling object. Returns OBJECT_INVALID if the calling object is not a valid door or placeable. 
#### Remarks
Also returns OBJECT_INVALID if the object was created locked in the Toolset and hasn't been locked since. Calling SetLocked on an object will cause the object that script is run on to be the last locker. Unless it is called inside an AssignCommand, in which case it will return the object the SetLocked was assigned to. Calling SetLocked on a locked door will still change the value of GetLastLocked accordingly. 
#### Version
1.61 
#### See Also
functions:  |   GetLastUnlocked
