<!-- Source: https://nwnlexicon.com/index.php/GetSurfaceMaterial -->

# GetSurfaceMaterial(location)

Get the surface material at the given location. 
int GetSurfaceMaterial( location at);

### Parameters 

at
    The location to check the surface material of.
### Description
Get the surface material at the given location. (This is equivalent to the walkmesh type). 
Returns 0 if the location is invalid or has no surface type. 
### Remarks
This primarily can be used to check the different information in the surfacemat.2da file. The column "Walk" shows the location is walkable, for instance. Other useful columns may be "Sound" that is a lookup to footstepsounds.2da or "IsWater" to see if the location is on some water (walkable or not). 
Note a tiles walkmesh must include the given location else it will return 0 if there's no walkmesh. 
For a little more information about walkmeshes see the NWN Wiki. 
### Version
This function was added in 1.74.8156 of NWN:EE. 
### Example
void main(){ // Lookup the location of a waypoint object oWaypoint = GetObjectByTag("my_waypoint"); // Get the surface type int nSurfaceType = GetSurfaceMaterial(GetLocation(oWaypoint)); // Is this waypoint on a valid, walkable, surface? Eg; we can spawn a creature int bWalkable = StringToInt(Get2DAString("surfacemat", "Walk", nSurfaceType)); if(bWalkable) { PostString(GetFirstPC(), "The location at my_waypoint is walkable!"); } else { PostString(GetFirstPC(), "The location at my_waypoint is not walkable!"); }}
### See Also
functions:  | GetGroundHeight()
