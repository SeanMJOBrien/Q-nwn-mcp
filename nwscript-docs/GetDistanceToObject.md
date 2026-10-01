<!-- Source: https://nwnlexicon.com/index.php?title=GetDistanceToObject&amp;action=history -->

# GetDistanceToObject

# GetDistanceToObject(object)
The distance from the caller of the script to the object in meters. 
float GetDistanceToObject( object oObject);
#### Parameters
_oObject_
A valid object variable describing the object you wish to measure the distance to. 
#### Description
Returns the distance from the caller of the script to the object in meters. Return value is a float of -1.0 if the object to measure to is INVALID. 
#### Remarks
The measurement taken will be from whatever in game object is calling this script. Note that it of course can be invalid (-1.0) if they are in different areas, one object is not something that has a distance (Area's, module's), although items probably return the distance to the person that possess it (if it is possessed by a creature). 
#### Version
1.22 
#### See Also
functions:  |   GetDistanceBetweenLocations
