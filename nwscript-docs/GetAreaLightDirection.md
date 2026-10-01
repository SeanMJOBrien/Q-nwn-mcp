<!-- Source: https://nwnlexicon.com/index.php/GetAreaLightDirection -->

# GetAreaLightDirection(int, object)

Gets the light direction of origin in the area specified. 
vector GetAreaLightDirection( int nLightType, object oArea=OBJECT_INVALID,);
#### Parameters 

nLightType
    The light type returned (moon or sun). Valid values are the AREA_LIGHT_DIRECTION_* constants. 

oArea
    The area to query for light direction.
#### Description
Gets the light direction of origin in the area specified. 
If no valid area (or object) is specified, it uses the area of caller. If an object other than an area is specified, will use the area that the object is currently in. 
#### Remarks
This can be combined with SetAreaLightDirection to change the direction of light and therefore shadows the sun creates - you can have it move like the sun in real life as the time of day changes. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed GetAreaLightDirection() causing scripting errors. 
#### Example
See the file nw_inc_dynlight.nss that includes a complete library to do sun direction setting. 
#### See Also
constants:  |  AREA_LIGHT_DIRECTION_* Constants   

functions:  |  GetAreaLightColor() SetAreaLightColor() SetAreaLightDirection()
