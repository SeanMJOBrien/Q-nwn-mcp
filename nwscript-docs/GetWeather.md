<!-- Source: https://nwnlexicon.com/index.php/GetWeather -->

# GetWeather(object)

Gets the current weather conditions for a given area 
int GetWeather( object oArea);
#### Parameters 

oArea
    Area to get the weather of
#### Description
Returns a WEATHER_* "Weather \(constant\)") value, line from weathertype.2da, or WEATHER_INVALID in case of error (such as oArea not being valid, or an area). 
_Note:_ If called on an Interior area, this will always return WEATHER_CLEAR. 
#### Version
This function was added in 1.80.8193.14 of NWN:EE. 
#### See Also
functions:  |   SetWeather   

constants:  |   WEATHER_* Constants  "Weather \(constant\)")
