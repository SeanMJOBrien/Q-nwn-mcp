<!-- Source: https://nwnlexicon.com/index.php/ActionJumpToLocation -->

# ActionJumpToLocation(location)
Instantly sends the calling object to the position of locTarget. 
void ActionJumpToLocation( location locTarget);

### Parameters 

locTarget
    Target location
### Description
The calling object will be instantly relocated to the position of locTarget (or as near to it as possible). This function will work within or across area borders. If locTarget isn't a valid object (or is unspecified) the function call will fail. 
### Remarks
There is no visual effect associated with this action; you must create it yourself. Using ApplyEffectAtLocation() and ApplyEffectToObject() combined with an EffectVisualEffect() effect is great for doing this. 
Location values can easily be acquired using the GetLocation() function, or set with the Location() function. 
When a PC leaves an Area or Trigger because you've jumped to a location causes the OnExit event of the departed object to fire. 
Does not affect creatures that are dead; they must have HP above 0 for this function to work properly. 
### Version
1.26 
### Example
// ActionJumpToLocation the easy way.// This script will jump the calling object to a waypoint's location.void main(){ object oWaypoint = GetWaypointByTag("Destination"); location lLocation = GetLocation(oWaypoint); ActionJumpToLocation(lLocation);}// ActionJumpToLocation the hard way// This script will send the calling object to the coordinates// specified by the vPosition vector.void main(){ object oArea = GetArea(OBJECT_SELF); vector vPosition = Vector(2.0, 3.0, 0.0); // x:2, y:3, z:0 location locTarget = Location(oArea, vPosition, 90.0); ActionJumpToLocation(locTarget);}
### See Also
functions:  | ActionJumpToObject, ActionMoveToLocation
