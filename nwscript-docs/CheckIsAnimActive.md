<!-- Source: https://nwnlexicon.com/index.php/CheckIsAnimActive -->

# CheckIsAnimActive(object)
Turns off the calling object's NW_ANIM_FLAG_IS_ACTIVE animation condition if there are no players in the same area. 
int CheckIsAnimActive( object oCreature);

### Parameters 

oCreature
    Not used.
### Description
Turns off the calling object's NW_ANIM_FLAG_IS_ACTIVE animation condition if there are no players in the same area. If this happens, the function will return FALSE. 
Otherwise, this function returns TRUE. 
### Remarks
Though object oCreature is listed as a parameter of this function, it is not used anywhere in the function. 
NOTE: If the calling object's NW_ANIM_FLAG_CONSTANT animation condition is set, then no change is made to NW_ANIM_FLAG_IS_ACTIVE and the function returns TRUE. This happens regardless of if there is a player in the area or not. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | SetAnimationCondition
