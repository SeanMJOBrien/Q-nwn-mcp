<!-- Source: https://nwnlexicon.com/index.php/AnimActionFindFriend -->

# AnimActionFindFriend(float)
Causes an NPC to find a friend and engage in conversation with them. 
int AnimActionFindFriend( float fMaxDistance);

### Parameters 

fMaxDistance
    The  DISTANCE_*  constant corresponding to the maximum distance to look for a friend.
### Description
Causes an NPC to find a friend within fMaxDistance and engage in conversation with them. Will not attempt to talk to another friend who is currently engaged in talking with another NPC. The greeting used during the conversation can be a simple "Hello", a bow, or an animated greeting; this greeting is random but is weighted by hit dice. 
### Requirements
#include "x0_i0_anims" 
### Version
1.61 
### See Also
constants:  | DISTANCE_* Constants
