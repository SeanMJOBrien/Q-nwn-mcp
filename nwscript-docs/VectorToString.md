<!-- Source: https://nwnlexicon.com/index.php/VectorToString -->

# VectorToString(vector)

Turn a vector into a string. Useful for debugging. 
string VectorToString( vector vec);
#### Parameters 

vec
    The vector to be converted.
#### Description
A debug function that returns a string representation of the vector parameter formatted as follows: (xAxis, yAxis, zAxis) where: xAxis, yAxis, and zAxis are floats. 
#### Requirements
#include "x0_i0_position" 
#### Function Code
// Turn a vector into a string. Useful for debugging.string VectorToString(vector vec){ return "(" + FloatToString(vec.x) + ", " + FloatToString(vec.y) + ", " + FloatToString(vec.z) + ")";}
#### See Also
functions:  |  LocationToString
