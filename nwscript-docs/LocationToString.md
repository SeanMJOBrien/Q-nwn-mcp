<!-- Source: https://nwnlexicon.com/index.php/LocationToString -->

# LocationToString(location)

Turn a location into a string. Useful for debugging. 
string LocationToString( location loc);
#### Parameters 

loc
    The location to be converted.
#### Description
Returns the string representation of the location(loc). 
#### Remarks
Essentially a debug function that returns a string representation of the location parameter formatted as follows: 
(AreaTag) (xAxis, yAxis, zAxis) (facing) 
Where AreaTag is a string and xAxis, yAxis, zAxis, and facing are floats 
#### Requirements
#include "x0_i0_position" 
#### Version
1.61 
#### Function Code
// Turn a location into a string. Useful for debugging.string LocationToString(location loc){ return "(" + GetTag(GetAreaFromLocation(loc)) + ")" + " " + VectorToString(GetPositionFromLocation(loc)) + " (" + FloatToString(GetFacingFromLocation(loc)) + ")";}
#### See Also
functions:  |   VectorToString
