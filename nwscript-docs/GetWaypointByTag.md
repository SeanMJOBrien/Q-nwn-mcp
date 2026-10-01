<!-- Source: https://nwnlexicon.com/index.php/GetWaypointByTag -->

# GetWaypointByTag

# GetWaypointByTag(string)
Get the first waypoint with a specified tag. 
object GetWaypointByTag( string sWaypointTag);
#### Parameters
_sWaypointTag_
Tag of waypoint. 
#### Description
Returns, as an object, the first waypoint with the tag sWaypointTag. Returns OBJECT_INVALID if the waypoint cannot be found. 
#### Version
1.22 
#### Example
// Attached to OnClick event of a trigger. Sends clicker to// destination defined by waypoint WP_Destination.void main(){ object oClicker = GetClickingObject(); object oTarget = GetWaypointByTag("WP_Destination"); location lDest = GetLocation(oTarget); AssignCommand(oClicker, ActionJumpToLocation(lDest));}
#### See Also  
---
