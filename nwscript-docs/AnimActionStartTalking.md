<!-- Source: https://nwnlexicon.com/index.php/AnimActionStartTalking -->

# AnimActionStartTalking(object, int)
Start talking with a friend. 
void AnimActionStartTalking( object oFriend, int nHDiff = 0);

### Parameters 

oFriend
    The creature to speak with. 

nHDiff
    Used to determine if the caller should be more cordial. (Default: 0)
### Description
Start talking with a friend. 
### Remarks
nHDiff looks to mean the hit dice of oFriend. 
If the NPC or oFriend are not immobile, they will first move towards each other and say hello. They will then stand facing each other. 
Call AnimActionStopTalking() to stop talking. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | AnimActionStopTalking
