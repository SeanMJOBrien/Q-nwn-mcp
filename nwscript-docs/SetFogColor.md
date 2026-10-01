<!-- Source: https://nwnlexicon.com/index.php/SetFogColor -->

# SetFogColor

# SetFogColor(int, int, object)
Sets the fog color in the area specified. 
void SetFogColor( int nFogType, int nFogColor, object oArea = OBJECT_INVALID);
#### Parameters
_nFogType_
FOG_TYPE_* specifies whether the Sun, Moon, or both fog types are set. 
_nFogColor_
FOG_COLOR_* specifies the color the fog is being set to. 
_oArea_
The area to change the fog color of (Default: OBJECT_INVALID) 
#### Description
This will set the fog color in an area, which should change it instantly to that specified. If no valid area (or object) is specified, it uses the area of caller. If an object other than an area is specified, will use the area that the object is currently in (Or if the module, will not do anything). The fog color can also be represented as a hex RGB number if specific color shades are desired. The format of a hex specified color would be 0xFFEEDD where FF would represent the amount of red in the color EE would represent the amount of green in the color DD would represent the amount of blue in the color. 
#### Remarks
This is most useful for mood setting, or now, with the combination of SetWeather(), SetSkyBox() and other functions to affect an area, you can dramatically change what an area feels like after, or during an event. Fog also must, of course, be visible, to be really useful. The fog distance setting should be the default, or lower, for best results. Also note that any area lighting is not affected - if you suddenly make the fog red, but the lights are still all blue, it might look a little strange. 
#### Version
1.64 
#### Example 1
// Change the color of the fog in this area to red. Use, perhaps, in// an areas On Enter event, or via. ExecuteScript().void main(){ // Get the area to change the fog color of. object oArea = OBJECT_SELF; // Change it (all cases - moonlight and sunlight, day and night) // so that the fog color is now red. SetFogColor(FOG_TYPE_ALL, FOG_COLOR_RED, oArea);}
#### Example 2
// Area OnEnter event script.// If it is currently dawn or daytime and the daytime fog color is set to one // of the standard DARK types, change it to the corresponding non-DARK color.// If it is currently dusk or night and the nighttime fog color is set to one// of the standard non-DARK types that has a DARK counterpart, change it to// the corresponding DARK color.// Otherwise don't change the fog color.void main(){ object oArea = OBJECT_SELF; // If it is dawn or day... if(GetIsDawn() || GetIsDay()) { // Determine the current daytime fog color int iSunFogColor = GetFogColor(FOG_TYPE_SUN, oArea); // Determine the new daytime fog color int iNewSunFogColor; switch(iSunFogColor) { case FOG_COLOR_BLUE_DARK: iNewSunFogColor = FOG_COLOR_BLUE; break; case FOG_COLOR_BROWN_DARK: iNewSunFogColor = FOG_COLOR_BROWN; break; case FOG_COLOR_GREEN_DARK: iNewSunFogColor = FOG_COLOR_GREEN; break; case FOG_COLOR_ORANGE_DARK: iNewSunFogColor = FOG_COLOR_ORANGE; break; case FOG_COLOR_RED_DARK: iNewSunFogColor = FOG_COLOR_RED; break; case FOG_COLOR_YELLOW_DARK: iNewSunFogColor = FOG_COLOR_YELLOW; break; default: // Current color is not a standard DARK one so no change. iNewSunFogColor = iSunFogColor; break; } // Change the daytime fog color if the new color is different than the current color. if(iNewSunFogColor != iSunFogColor) { SetFogColor(FOG_TYPE_SUN, iNewSunFogColor, oArea); } } else // it must be either dusk or night... { // Determine the current nighttime fog color int iMoonFogColor = GetFogColor(FOG_TYPE_MOON, oArea); // Determine the new nighttime fog color int iNewMoonFogColor; switch(iMoonFogColor) { case FOG_COLOR_BLUE: iNewMoonFogColor = FOG_COLOR_BLUE_DARK; break; case FOG_COLOR_BROWN: iNewMoonFogColor = FOG_COLOR_BROWN_DARK; break; case FOG_COLOR_GREEN: iNewMoonFogColor = FOG_COLOR_GREEN_DARK; break; case FOG_COLOR_ORANGE: iNewMoonFogColor = FOG_COLOR_ORANGE_DARK; break; case FOG_COLOR_RED: iNewMoonFogColor = FOG_COLOR_RED_DARK; break; case FOG_COLOR_YELLOW: iNewMoonFogColor = FOG_COLOR_YELLOW_DARK; break; default: // Current color is not a standard non-DARK one with a DARK counterpart so no change. iNewMoonFogColor = iMoonFogColor; break; } // Change the nighttime fog color if the new color is different than the current color. if(iNewMoonFogColor != iMoonFogColor) { SetFogColor(FOG_TYPE_MOON, iNewMoonFogColor, oArea); } }}
#### See Also
functions:  |   SetTileSourceLightColor   

constants:  |   FOG_TYPE_* Constants
