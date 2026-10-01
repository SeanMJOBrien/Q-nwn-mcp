<!-- Source: https://nwnlexicon.com/index.php?title=SetFacing&amp;action=history -->

# SetFacing(float)
Sets the object to face a certain direction. 
void SetFacing( float fDirection);
#### Parameters 

fDirection
    A floating point number that represents the direction to face in degrees. See description for additional details.
#### Description
Causes the caller of this function to face fDirection. You can use AssignCommand or ExecuteScript to make other objects then the calling object change facing; the objects you can set facings of are Creatures, Items (on the ground), Waypoints and Placeables. 
There are some predefined constants for a direction: 
  * DIRECTION_EAST = 0.0
  * DIRECTION_NORTH = 90.0
  * DIRECTION_WEST = 180.0
  * DIRECTION_SOUTH = 270.0

You can use it with ActionDoCommand to set a facing after a movement action issued. 
#### Remarks
This action is often used for creatures. It also works for dynamic placeables, but small changes (less than 20 degrees) may not be rendered visually, even though the new facing (as determined by GetFacing) is exactly right. 
Note that GetFacing will correctly return the facing to the nearest degree. 
#### Known Bugs
There are issues with setting the facing of sitting creatures. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetFacing() not sending updates to clients for changes of less than 20 degrees. 
#### Example
// Used in the OnSpawn of a creature to set // their facing to a random direction.main(){ // Get a random direction from 0 to 360 float fDirection = IntToFloat(Random(361)); SetFacing(fDirection);}
#### See Also
functions:  |   SetFacingPoint   

constants:  |   DIRECTION_* Constants
