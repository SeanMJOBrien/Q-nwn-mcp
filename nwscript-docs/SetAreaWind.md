<!-- Source: https://nwnlexicon.com/index.php?title=SetAreaWind&amp;action=history -->

# SetAreaWind(object, vector, float, float, float)

Sets the detailed wind data for oArea. 
void SetAreaWind( object oArea, vector vDirection, float fMagnitude, float fYaw, float fPitch);
### Parameters 

oArea
    The area to update wind settings. 

vDirection
    The wind direction direction expressed as a vector. 

fMagnitude
    The wind strength setting. 

fYaw
    The wind yaw setting. 

fPitch
    The wind pitch setting.
### Description
Sets the detailed wind data for oArea 
The predefined values in the toolset area properties are: 
  * NONE: vDirection=(1.0, 1.0, 0.0), fMagnitude=0.0, fYaw=0.0, fPitch=0.0
  * LIGHT: vDirection=(1.0, 1.0, 0.0), fMagnitude=1.0, fYaw=100.0, fPitch=3.0
  * HEAVY: vDirection=(1.0, 1.0, 0.0), fMagnitude=2.0, fYaw=150.0, fPitch=5.0

### Remarks
This allows a modicum of control over the rather basic wind in NWN. The wind affects: 
  * New 8193.14 onwards water (waves and the like)
  * Some visual effects such as smoke and dust effects
  * "Danglymesh" on objects - Flags, pennants, and some creature body parts

It is worth experimenting with it, and can be quite fun to change (at least you can now attempt different wind directions!). 
The vDirection should probably be normalised, or clamped to a maximum of 1.0, 1.0, 1.0, and fMagnitude altered, but you might find it easier to overdo a specific vDirection amount than messing with fMagnitude and increasingly weird values of vDirection to get it to work well. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
void setWind(object oArea, float fWindStrength, string sWindDirection) { vector vDirection = Vector(1.0, 1.0, 0.0); if (sWindDirection == "Southwind") vDirection = Vector(0.0, 1.0, 0.0); if (sWindDirection == "Westwind") vDirection = Vector(1.0, 0.0, 0.0); if (sWindDirection == "Northwind") vDirection = Vector(0.0, -1.0, 0.0); if (sWindDirection == "Eastwind") vDirection = Vector(-1.0, 0.0, 0.0); if (sWindDirection == "Northeastwind") vDirection = Vector(-1.0, -1.0, 0.0); if (sWindDirection == "Southeastwind") vDirection = Vector(-1.0, 1.0, 0.0); if (sWindDirection == "Northwestwind") vDirection = Vector(1.0, -1.0, 0.0); if (sWindDirection == "Southwestwind") vDirection = Vector(1.0, 1.0, 0.0); SetAreaWind(oArea, vDirection, fWindStrength, fWindStrength * 50.0, fWindStrength * 1.0);}void main() { object oArea = GetObjectByTag("AREA_FIFTYONE"); float fWindStrength = 2.0f; string sWindDirection = "Southwind"; setWind(oArea, fWindStrength, sWindDirection);}
### See Also
functions:  | SetWeather GetWeather
