<!-- Source: https://nwnlexicon.com/index.php/CreateObjectVoid -->

# CreateObjectVoid

# CreateObjectVoid(int, string, location, int)
Similar to CreateObject() but does not return the object created. 
void CreateObjectVoid( int nObjectType, string sTemplate, location lLoc, int bUseAppearAnimation = FALSE);
#### Parameters
_nObjectType_
 OBJECT_TYPE_* 
_sTemplate_
The blueprint ResRef string of the object to be created. 
_lLoc_
The location where the object should be created. 
_bUseAppearAnimation_
Causes the created object to use an animation when it appears. (Default: FALSE) 
#### Description
Creates an object (determined by nObjectType) with the blueprint ResRef (sTemplate) at lLoc. This is similar to the standard CreateObject() function, but unlike that function CreateObjectVoid() does not return the object created by itself. 
#### Remarks
Only the following constants are valid for the nObjectType parameter: - OBJECT_TYPE_ITEM - OBJECT_TYPE_CREATURE - OBJECT_TYPE_PLACEABLE - OBJECT_TYPE_STORE - OBJECT_TYPE_WAYPOINT 
#### Requirements
#include " nw_i0_2q4luskan " 
#### Version
1.61 
#### See Also
functions:  |   CreateObject   

constants:  |   OBJECT_TYPE_* Constants
