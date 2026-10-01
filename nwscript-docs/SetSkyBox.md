<!-- Source: https://nwnlexicon.com/index.php/SetSkyBox -->

# SetSkyBox(int, object)
Changes the sky that is displayed in the specified area. 
void SetSkyBox( int nSkyBox, object oArea = OBJECT_INVALID);
#### Parameters 

nSkyBox
    A SKYBOX_* constant (or line ID from skyboxes.2da). 

oArea
    The area the skybox needs changing in (Default: OBJECT_INVALID)
#### Description
Changes the sky that is displayed in the specified area, to one of the SKYBOX_* constants (associated with skyboxes.2da). 
If an object other than an area is specified, it uses the area that the object is currently in or if the script is running from an area event it uses that area. If the caller is something like the module itself or the caller isn't in an valid area (eg going through an area transition), the function fails to do anything. 
#### Remarks
This simply will change it to one of the other skyboxs, instantly. There can be no transition. 
To change a skybox to a newly added one, you of course must reference a skyboxes.2da line in the nSkyBox parameter. 
This is best used to change a skybox according to the weather, or some really evil or really good thing is going on (a skybox depicting hell might be useful if your evil demon lord decides to invade your nice city). Normally, you just want to change the skybox according to the weather however. Used in conjunction with SetWeather, you can change both at once. 
#### Version
1.64 
#### Example 1
// Change the weather in OBJECT_SELF's area to stormy, and// change the skybox to SKYBOX_GRASS_STORM.void main(){ // Define us, the area to change (perhaps using the On Enter event) object oArea = OBJECT_SELF; // Change the weather. SetWeather(oArea, WEATHER_RAIN); // Set the skybox. SetSkyBox(SKYBOX_GRASS_STORM, oArea);}
#### Example 2
// Area OnEnter event script.// If the weather in the area being entered is raining and the skybox is// currently set to SKYBOX_GRASS_CLEAR, change it to SKYBOX_GRASS_STORM.// If the weather in the area is clear and the skybox is currently set to// SKYBOX_GRASS_STORM, change it to SKYBOX_GRASS_CLEAR.// Otherwise don't change the skybox.void main(){ object oArea = OBJECT_SELF; // Determine the current weather conditions and the skybox being used. int iWeatherCondition = GetWeather(oArea); int iCurrentSkyBox = GetSkyBox(oArea); // If it is raining and the skybox is set to SKYBOX_GRASS_CLEAR, change // it to SKYBOX_GRASS_STORM. if((iWeatherCondition == WEATHER_RAIN) &amp;&amp; (iCurrentSkyBox == SKYBOX_GRASS_CLEAR)) SetSkyBox(SKYBOX_GRASS_STORM, oArea); // If it is clear and the skybox is set to SKYBOX_GRASS_STORM, change it // to SKYBOX_GRASS_CLEAR. else if((iWeatherCondition == WEATHER_CLEAR) &amp;&amp; (iCurrentSkyBox == SKYBOX_GRASS_STORM)) SetSkyBox(SKYBOX_GRASS_CLEAR, oArea);}
#### See Also
functions:  |  GetSkyBox  

constants:  |   SKYBOX_* Constants
