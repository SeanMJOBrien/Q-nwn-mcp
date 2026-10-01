<!-- Source: https://nwnlexicon.com/index.php/AnimActionRest -->

# AnimActionRest()
If injured find the best place to rest, based on the mobility setting, and go rest there. 
int AnimActionRest();

### Description
If injured and mobile, find the nearest NW_SAFE waypoint, go to it using ActionMoveToLocation(), and rest. 
Returns TRUE on success, FALSE on failure. 
### Remarks
Before the creature is moved to their safe location, ClearActions() (a wrapper for ClearAllActions()) is called to clear their queue. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | ActionRest  

events:  | OnRested Event
