<!-- Source: https://nwnlexicon.com/index.php?title=GetGroundHeight&amp;action=history -->

# GetGroundHeight(location)

Returns the z-offset at which the walkmesh is at the given location. 
float GetGroundHeight( location at);

### Parameters 

at
    The location to check ground height at.
### Description
Returns the z-offset at which the walkmesh is at the given location. 
Returns -6.0 for invalid locations. 
### Remarks
This is an easy enough way to check if a location is "valid". Just make sure the value isn't -6.0. 
To check for a walkable surface instead (which is also valid) see GetSurfaceMaterial. 
### Version
This function was added in 1.74.8156 of NWN:EE. 
### Example
// Places fog in an area of nAreaSizeX x nAreaSizeY tiles// with distance nStepSize between the fog placeablesvoid createFog(object oArea, int nStepSize) { int nAreaSizeX = GetAreaSize(AREA_WIDTH, oArea); int nAreaSizeY = GetAreaSize(AREA_HEIGHT, oArea); int i, j; for (i = 0; i < nAreaSizeX * 10; i = i + nStepSize) { for (j = 0; j < nAreaSizeY * 10; j = j + nStepSize) { location lLocation = Location(oArea, Vector(IntToFloat(i), IntToFloat(j), 0.0), 0.0); float z = GetGroundHeight(lLocation); vector vPosition = Vector(IntToFloat(i), IntToFloat(j), z); location lPlaceableLocation = Location(oArea, vPosition, 0.0); CreateObject(OBJECT_TYPE_PLACEABLE, "fog_resref", lPlaceableLocation, FALSE, "FOG_TAG"); } } } void main() { object oArea = GetObjectByTag("AREA_TAG"); int nStepSize = 30; createFog(oArea, nStepSize);}
### See Also
functions:  | GetSurfaceMaterial()
