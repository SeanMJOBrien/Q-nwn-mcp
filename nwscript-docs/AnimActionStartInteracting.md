<!-- Source: https://nwnlexicon.com/index.php/AnimActionStartInteracting -->

# AnimActionStartInteracting(object)
Start interacting with a placeable object. 
void AnimActionStartInteracting( object oPlaceable);

### Parameters 

oPlaceable
    The object to interact with.
### Description
Start interacting with a placeable object. 
### Remarks
oPlaceable must be a valid object. There is no internal testing in this function to validate it. 
If the creature has either NW_ANIM_FLAG_IS_MOBILE or NW_ANIM_FLAG_IS_MOBILE_CLOSE_RANGE set as animation conditions then AnimActionStopInteracting() to stop interacting with the placeable. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | SetAnimationCondition  

constants:  | DISTANCE_*
