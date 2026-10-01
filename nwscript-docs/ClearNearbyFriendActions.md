<!-- Source: https://nwnlexicon.com/index.php/ClearNearbyFriendActions -->

# ClearNearbyFriendActions(object, int)
Clears the actions of a creature and all nearby friends 
void ClearNearbyFriendActions( object oTarget = OBJECT_SELF, int bClearCombat = FALSE);

### Parameters 

oTarget
    The creature whose friends' actions are to be cleared (Default: OBJECT_SELF) 

bClearCombat
    Whether to stop combat as well (Default: FALSE)
### Description
Clears the action queues of oTarget and the nearest 10 friendly creatures to the oTarget. Useful for stopping a battle in progress. 
Unless bClearCombat is TRUE, any current fighting involving the friends will continue. 
Nearby friend is defined as GetNearestCreature(CREATURE_TYPE_REPUTATION, REPUTATION_TYPE_FRIEND, oTarget). 
### Remarks
Found in x0_i0_partywide.nss, an include library for party-wide functions. 
### Requirements
#include "x0_i0_partywide" 
### Version
1.61 
### See Also
constants:  | CREATURE_TYPE_* Constants
