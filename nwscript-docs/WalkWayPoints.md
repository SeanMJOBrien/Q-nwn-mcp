<!-- Source: https://nwnlexicon.com/index.php/WalkWayPoints -->

# WalkWayPoints

# WalkWayPoints(int, float)
Make an NPC creature walk a series of preset waypoints. 
void WalkWayPoints( int nRun = FALSE, float fPause = 1.0);
#### Parameters
_nRun_
Determines if the NPC walks or runs. (Default: FALSE) 
_fPause_
The amount of time, in seconds, to pause at each waypoint. (Default: 1.0) 
#### Description
Makes the caller walk (run if nRun is TRUE) a series of pre-defined specially tagged waypoints and pause at each waypoint. 
#### Remarks
The waypoints to walk must have tags in the format "WP_" + NPC's tag name + "_0#". Example: WP_CITYGUARD_01. The # determines what order the NPC walks the waypoints in. You may also have up to one "POST_" + NPC's tag name waypoint tagged; if so the NPC will return to this waypoint after a combat. Waypoint names are case-sensitive. If a creature is currently walking waypoints and is stopped for any reason (i.e. engaging an enemy), then when the creature resumes walking it's waypoints it starts from the nearest waypoint. To avoid this, you must create your own WalkWayPoint function. If you do create your own WalkWayPoint function, then you cannot name the waypoints with the standard "WP_" prefix (doing so will confuse the DetermineCombatRound() function). 
#### Known Bugs
There's an issue with walkwaypoints if you flag a character with either SetSpawnInCondition(NW_FLAG_IMMOBILE_AMBIENT_ANIMATIONS) or SetSpawnInCondition(NW_FLAG_AMBIENT_ANIMATIONS). It works fine at first but the character stops walking when he does something else. You can't make them to walk again even when giving them the WalkWayPoints(); command. 
#### Requirements
#include " x0_i0_walkway " 
#### Version
1.28 
#### See Also
functions:  |   CheckWayPoints
