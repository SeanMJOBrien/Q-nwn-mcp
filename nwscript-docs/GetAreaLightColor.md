<!-- Source: https://nwnlexicon.com/index.php?title=GetAreaLightColor&amp;action=history -->

# GetAreaLightColor(int, object)

Gets the light color in the area specified. 
int GetAreaLightColor( int nColorType, object oArea=OBJECT_INVALID);
#### Parameters 

nColorType
    The color type returned. Valid values are the AREA_LIGHT_COLOR_* constants. 

oArea
    The area to query for light color.
#### Description
Gets the light color in the area specified. 
  * nColorType specifies the color type returned.
  * Valid values for nColorType are the AREA_LIGHT_COLOR_* values.

If no valid area (or object) is specified, it uses the area of caller. If an object other than an area is specified, will use the area that the object is currently in. 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  AREA_LIGHT_COLOR_* Constants   

functions:  |  GetAreaLightDirection() SetAreaLightColor() SetAreaLightDirection()
