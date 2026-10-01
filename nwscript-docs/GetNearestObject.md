<!-- Source: https://nwnlexicon.com/index.php/GetNearestObject -->

# GetNearestObject(int, object, int)
Gets the nearest object, which matches given criteria, to the selected target. 
object GetNearestObject( int nObjectType = OBJECT_TYPE_ALL, object oTarget = OBJECT_SELF, int nNth = 1);
#### Parameters 

nObjectType
    Object type to find, an OBJECT_TYPE_* constant. More than one can be included with bitwise OR | (Default:  OBJECT_TYPE_ALL ) 

oTarget
    Object to find things near (Default: OBJECT_SELF) 

nNth
    The nNth thing to find (Default: 1)
#### Description
Get the Nth object nearest to oTarget that is of the specified type (OBJECT_TYPE_* constant). You can use bitwise OR to contatinate multiple options, eg: doors and placeables would be GetNearestObject(OBJECT_TYPE_DOOR | OBJECT_TYPE_PLACEABLE, OBJECT_SELF, 1); 
Return value on error: OBJECT_INVALID. 
For example, the following script snippet would set object oNearestDoor to the third nearest door to the object oPC: 
object o3rdNearestDoor = GetNearestObject(OBJECT_TYPE_DOOR, oPC, 3);
#### Remarks
It can only return objects in oTarget's area, as GetNearestObjectByTag does, and is intended behaviour. Obviously, this also means Modules and Areas cannot return a valid value for this. 
Along with GetNearestObjectToLocation, GetNearestObjectByTag and GetNearestCreature if you are running a huge loop - say of a lot of different objects in an area - this function each time it is called runs an entire check of objects from scratch unlike GetFirstObjectInShape/GetNextObjectInShape. Therefore in very busy areas it might be better to use GetFirstObjectInArea/GetNextObjectInArea to more efficiently loop over the objects you need to affect. For smaller loops or scripts though this is unlikely to be a problem. 
#### Version
1.22 
#### Example
// This script is for a bar maid tagged "BAR_MAID".// The bar maid will find the third nearest door// and attempt to walk to it. void main{ // Initialize objects. object oBarMaid = GetObjectByTag("BAR_MAID"); object oDoor = GetNearestObject(OBJECT_TYPE_DOOR, oBarMaid, 3) // Bar maid walks to the third nearest door. ActionForceMoveToObject(oDoor)}
// This script will get the nearest placeable or door object and walk to itvoid main(){ object oDoorOrPlaceable = GetNearestObject(OBJECT_TYPE_DOOR | OBJECT_TYPE_PLACEABLE, OBJECT_SELF, 1); ActionMoveToObject(oDoorOrPlaceable);}
#### See Also
functions:  |  GetNearestObjectToLocation , GetNearestCreature, GetNearestObjectByTag  

constants:  |   OBJECT_TYPE_* Constants
