<!-- Source: https://nwnlexicon.com/index.php?title=SetAreaLightDirection&amp;action=history -->

# SetAreaLightDirection(int, vector, object, float)

Sets the light direction of origin in the area specified. 
void SetAreaLightDirection( int nLightType, vector vDirection, object oArea=OBJECT_INVALID, float fFadeTime = 0.0);
#### Parameters 

nLightType
    The light type returned. Valid values are the AREA_LIGHT_DIRECTION_* constants. 

vDirection
    specifies the direction of origin of the light type, i.e. the direction the sun/moon is in from the area. 

oArea
    The area to query for light direction. 

fFadeTime
    If fFadeTime is above 0.0, it will fade to the new color in the amount of seconds specified.
#### Description
Sets the light direction of origin in the area specified. If no valid area (or object) is specified, it uses the area of caller. If an object other than an area is specified, will use the area that the object is currently in. 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  AREA_LIGHT_DIRECTION_* Constants   

functions:  |  GetAreaLightColor() GetAreaLightDirection() SetAreaLightColor()
