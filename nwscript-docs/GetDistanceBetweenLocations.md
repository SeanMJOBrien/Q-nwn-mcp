<!-- Source: https://nwnlexicon.com/index.php/GetDistanceBetweenLocations -->

# GetDistanceBetweenLocations

# GetDistanceBetweenLocations(location, location)
The distance in meters between two locations in the game. 
float GetDistanceBetweenLocations( location lLocationA, location lLocationB);
#### Parameters
_lLocationA_
A location variable. 
_lLocationB_
A location variable. 
#### Description
Returns the distance in meters between two locations, or -1.0000 if the locations are in two different areas, or are invalid locations in some way. This is useful for checking distances between any non-objects, random locations, or between a location (EG: a spell target location) and a object's location. If it is two objects, it is usually easier and faster to call GetDistanceBetween(). 
#### Remarks
This also takes into account the Z-axis, and thusly isn't a direct measurement in only X and Y. To get a direct measurement (discounting the Z-axis) you must use Vectors. Remember, the float value returned by this is in in-game meters. Each in-game tile is 10x10M. 
#### Version
1.62 
#### Example
// Check the distance between me, and our pre-set location stored// on us (perhaps by our spawn script, to the location we spawned in// at). If over 20M away, we run back to it, even in combat.void main(){ // Get the stored location. location lPost = GetLocalLocation(OBJECT_SELF, "MY_POST"); // Get our location location lSelf = GetLocation(OBJECT_SELF); // Check the distance float fDistance = GetDistanceBetweenLocations(lPost, lSelf); // If fDistance is -1.0 (different area), or we are 20M  // away, we run back if(fDistance == -1.0 || fDistance &gt;= 20.0) { // Move to the post. ClearAllActions(); ActionMoveToLocation(lPost); }}
#### See Also
functions:  |   GetDistanceToObject
