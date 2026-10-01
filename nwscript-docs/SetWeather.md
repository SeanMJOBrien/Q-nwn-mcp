<!-- Source: https://nwnlexicon.com/index.php/SetWeather -->

# SetWeather(object, int)

Allows you to set the weather for an area or the entire module. 
void SetWeather( object oTarget, int nWeather);
#### Parameters 

oTarget
    If this is GetModule(), all outdoor areas will be modified by the weather constant. If it is an area, oTarget will play the weather only if it is an outdoor area. 

nWeather
     WEATHER_*  "Weather \(constant\)") (or a line from weathertypes.2da)
#### Description
Set the weather for oTarget. 
  * WEATHER_USE_AREA_SETTINGS will set the area back to whatever weather the area had set in the toolset.
  * WEATHER_CLEAR, WEATHER_RAIN, WEATHER_SNOW or another line from weathertypes.2da will make the weather go to the appropriate precipitation using the delay in weathertypes.2da (usually 6000, or 6 seconds).

#### Remarks
In NWN:EE custom weathers can be supported by using weathertypes.2da. These can be mean new visual effects and lightning effects. 
_Note:_ There is still no way to set the chance of lighting. The area in question must have a lightning % chance set in the area properties. Of course new weather effects means you could put lightning into your usual weather fx, and have that deal with it. 
#### Known Bugs
When changing the weather from WEATHER_RAIN to WEATHER_SNOW, the lightning weather effect continues to occur. Go from WEATHER_RAIN to WEATHER_CLEAR to WEATHER_SNOW to avoid this unnatural phenomenon. 
#### Version
1.31 - GetWeather added. 
This function was updated in 1.80.8193.14 of NWN:EE. You can now define new weathers using weathertypes.2da. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetWeather() causing the weather effects to disappear if setting the type to the already current. 
#### Example
// script to make it snow (module wide) void main(){ object oModule = GetModule(); SetWeather(oModule, WEATHER_SNOW);}
#### See Also
functions:  |   SetCalendar  GetWeather  

constants:  |   WEATHER_* Constants  "Weather \(constant\)")
