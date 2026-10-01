<!-- Source: https://nwnlexicon.com/index.php?title=SetAreaLightColor&amp;action=history -->

# SetAreaLightColor(int, int, object, float)

Sets the light color in the area specified. 
void SetAreaLightColor( int nColorType, int nColor, object oArea=OBJECT_INVALID, float fFadeTime = 0.0);
#### Parameters 

nColorType
    Specifies the color type. Valid values are the AREA_LIGHT_COLOR_* constants. 

nColor
    Specifies the fog color. Valid values are the FOG_COLOR_* constants, or a hex RGB number. 

oArea=OBJECT_INVALID
    Specifies the area to color. 

fFadeTime=0.0f
    If fFadeTime is above 0.0, it will fade to the new color in the amount of seconds specified.
#### Description
Sets the light color in the area specified. 
  * nColorType = AREA_LIGHT_COLOR_* specifies the color type.
  * nColor = FOG_COLOR_* specifies the color the fog is being set to. The color can also be represented as a hex RGB number if specific color shades are desired. The format of a hex specified color would be 0xFFEEDD where 
    * FF would represent the amount of red in the color
    * EE would represent the amount of green in the color
    * DD would represent the amount of blue in the color

If no valid area (or object) is specified, it uses the area of caller. If an object other than an area is specified, will use the area that the object is currently in. If fFadeTime is above 0.0, it will fade to the new color in the amount of seconds specified. 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  AREA_LIGHT_COLOR_* Constants   FOG_COLOR_* Constants   

functions:  |  GetAreaLightColor() GetAreaLightDirection() SetAreaLightDirection()
