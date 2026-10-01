<!-- Source: https://nwnlexicon.com/index.php?title=GetNextObjectInArea&amp;action=history -->

# GetNextObjectInArea(object, int)
Determines the next object in an area. 
object GetNextObjectInArea( object oArea = OBJECT_INVALID, int nObjectFilter = OBJECT_TYPE_ALL);
#### Parameters 

oArea
    The area that contains the objects. (Default: OBJECT_INVALID) 

nObjectFilter
    This allows you to filter out undesired object types, using bitwise "or". For example, to return only creatures and doors, the value for this parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR. (default: OBJECT_TYPE_ALL)
#### Description
Returns the next object in oArea and OBJECT_INVALID if no more objects are found or on any errors. 
If no valid area is specified, it will use the caller's area. 
#### Remarks
You must call GetFirstObjectInArea with the same parameter before calling this function. 
Useful for making sure all things of a certain type in an area are checked (and actioned, like being destroyed) and may be easier then using GetObjectByTag(). Note GetObjectByTag may be still quicker (and doing a comparison of GetArea of the object) due to how that now is stored in the engine in EE. 
Do not do it too often in larger, or more populated areas, at least not without the object filter. 
For users of the Enhanced Edition of the game, this feature is available by way of the GetFirstArea() and GetNextArea() functions. 
#### Known Bugs
Sound objects, DMs and creatures possessed by a DM are skipped. Sound objects can instead be fetched by using GetObjectByTag, GetNearestObjectByTag or similar. DMs can be sought with GetFirstPC/GetNextPC loops. 
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. GetFirstObjectInArea()/GetNextObjectInArea now has a nObjectFilter parameter. 
#### Example
// Any objects in the area tagged "DESTROY" are destroyed.// Uses OBJECT_SELF as the area, but this can be substituted for// many things.void main(){ // Loop all objects in us, an area object oArea = OBJECT_SELF; object oObject = GetFirstObjectInArea(oArea); while(GetIsObjectValid(oObject)) { // Destroy any objects tagged "DESTROY" if(GetTag(oObject) == "DESTROY") { DestroyObject(oObject); } oObject = GetNextObjectInArea(oArea); }}
#### See Also
functions:  |  GetFirstObjectInArea GetFirstArea GetNextArea
