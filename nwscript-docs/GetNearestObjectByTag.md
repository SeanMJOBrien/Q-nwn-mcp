<!-- Source: https://nwnlexicon.com/index.php/GetNearestObjectByTag -->

# GetNearestObjectByTag(string, object, int)
Returns the nearest object to a target by searching for the object's tag value. 
object GetNearestObjectByTag( string sTag, object oTarget = OBJECT_SELF, int nNth = 1);
### Parameters 

sTag
    The tag of the item to be searched for. 

oTarget
    An object inside the area from whose location to begin searching. (Default: OBJECT_SELF) 

nNth
    Which object to return if there are multiple objects with the same tag. (Default: 1)
### Description
Returns the Nth object nearest to oTarget that has sTag as its tag value. 
Return value on error: OBJECT_INVALID 
The function selects the Nth (default is 1, i.e., nearest) nearest object to the given object that matches the supplied tag string. By default the oTARGET is equal to OBJECT_SELF but may be set to another object. 
The only parameter required for this function is tag value of type string. For example GetNearestObjectByTag(sFoo) would return the nearest object to the object caller (OBJECT_SELF) that has sFoo as its tag string. 
You could also retrieve the 3rd nearest object to oStatue1 that has the string tag value of sFoo: GetNearestObjectByTag(sFoo, oStatue1, 3). 
Reminder: The required parameter sTag must be a string value. You can do this one of two ways 
  1. Set the value outside the function call (i.e., string sFoo = "myObjectsTagName") or
  2. Use double quotes in the function to input the tag name directly into the function parameters (i.e., GetNearestObjectByTag("myObjectTagName"))

### Remarks
GetNearestObjectByTag() only retrieves the nearest object in the area that oTarget occupies. It is intended behaviour - and very useful for waypoint walking/checking, and so on. 
A loop can be set up, which increments nNth, so to loop objects of sTag in the area. Note that this along with other GetNearest will redo the loop each time it is invoked so may be faster to iterate using GetFirstObjectInArea/GetNextObjectInArea. 
If this is called when oTarget is something such as an area, module or invalid object, it basically will fail and return OBJECT_INVALID (same as if it found no object of that tag). 
Unlike GetObjectByTag(), an empty string ("") can be used for sTag - creatures with no tag (Most notably PC's!) will be picked up with this function. GetObjectByTag itself was fixed for blank tagged objects. It is highly recommend you be careful and check a blank string is not passed into this function which may cause unintended interactions with player objects. 
This function will return OBJECT_INVALID if trying to use an area as the location in which to search from. (You must provide an actual center point from which the function can work outwards.) 
### Version
1.22 
### Example
// Retrieves the nearest object in the area with the same tag // as the object calling the function. Of course, if this is an area, // or module, it will return an invalid object. It will also never return itself.void main(){ string sTag = GetTag(OBJECT_SELF); object oNearestObject = GetNearestObjectByTag(sTag);}
### See Also
functions:  | GetObjectByTag, GetNearestObject, GetNearestObjectToLocation, GetNearestCreature
