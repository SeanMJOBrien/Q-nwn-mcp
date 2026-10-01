<!-- Source: https://nwnlexicon.com/index.php/CountAllObjectsInAreaByTag -->

# CountAllObjectsInAreaByTag

# CountAllObjectsInAreaByTag(string, object)
Counts all objects in the area with a matching tag. 
int CountAllObjectsInAreaByTag( string sTag, object oSource = OBJECT_SELF);
#### Parameters
_sTag_
The tag you are interested in. 
_oSource_
An object in the area you are interested in. (Default: OBJECT_SELF) 
#### Description
Counts all objects in the area with a matching tag. 
#### Remarks
oSource should not be an area, it should be an object IN the area you are interested in. It might actually still work if oSource is an area but that isn't what the intent of the function is. This function performs a while loop on an area, counting up all the matches found by  GetNearestObjectByTag . Returns 0 if no matches are found. 
#### Requirements
#include " x0_i0_destroy " 
#### Version
??? 
#### See Also
functions:  |   GetNearestObjectByTag
