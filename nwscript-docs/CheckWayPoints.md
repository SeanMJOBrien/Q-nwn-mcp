<!-- Source: https://nwnlexicon.com/index.php/CheckWayPoints -->

# CheckWayPoints(object)
Checks to see if an NPC has a valid waypoint to walk to. 
int CheckWayPoints( object oWalker = OBJECT_SELF);

### Parameters 

oWalker
    The creature to check for valid waypoints. (Default: OBJECT_SELF)
### Description
This function takes oWalker's tag, and looks for waypoint tags with matching names: "POST_<tag>" and "WP_<tag>_01" (always checked). If the NW_FLAG_DAY_NIGHT_POSTING spawn-in condition has been set in oWalker's OnSpawn script, then "NIGHT_<tag>" and "WN_<tag>" are also sought. 
If ANY of these new tags is the tag of a valid waypoint, the function returns true. 
### Remarks
CheckWayPoints() could be useful as a sanity check on NPCs with waypoints. 
This is used by SetListeningPatterns() in nw_i0_generic to do prevent NPCs with waypoints to walk from going to sleep at night (unimplemented). 
### Requirements
#include "x0_i0_walkway" 
### Version
1.22 
### Example
// Source for CheckWayPoints():int CheckWayPoints(object oWalker = OBJECT_SELF){ object oWay1; object oWay2; object oWay3; object oWay4; string sTag = GetTag(oWalker); if(GetSpawnInCondition(NW_FLAG_DAY_NIGHT_POSTING)) { oWay2 = GetWaypointByTag("NIGHT_" + sTag); oWay4 = GetWaypointByTag("WN_" + sTag + "_01"); } oWay1 = GetWaypointByTag("POST_" + sTag); oWay3 = GetWaypointByTag("WP_" + sTag + "_01"); if(GetIsObjectValid(oWay2) || GetIsObjectValid(oWay4) || GetIsObjectValid(oWay1) || GetIsObjectValid(oWay3)) { return TRUE; } return FALSE;}
### See Also
functions:  | WalkWayPoints  

constants:  | NW_FLAG_* Constants
