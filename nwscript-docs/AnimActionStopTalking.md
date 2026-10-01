<!-- Source: https://nwnlexicon.com/index.php/AnimActionStopTalking -->

# AnimActionStopTalking(object, int)
Stop talking to the given friend. 
void AnimActionStopTalking( object oCreature, int nHDiff = 0);

### Parameters 

oCreature
    The object to stop conversing with. 

nHDiff
    oCreature's hit dice. (Default: 0)
### Description
Stop talking to the given friend. 
### Remarks
There is no internal test inside this function to see if either of the objects are actually talking to each other. 
nHDiff is used to determine if different animations are done, like bowing when playing the goodbye voicechat. 
If the caller is not immobile they will say goodbye and move away (maximum distance of 10 meters) from their friend. If they are not mobile they will turn around and perform a random animation. 
If oCreature is not immobile they will say goodbye, possibly bowing in the process, and move away (maximum distance of 20 meters) from their friend. If they are not mobile they will turn around and perform a random animation. 
### Known Bugs
This does not call SetCurrentFriend(OBJECT_INVALID) for BOTH objects. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | SetCurrentFriend
