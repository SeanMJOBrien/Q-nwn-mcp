<!-- Source: https://nwnlexicon.com/index.php/AnimActionGoInside -->

# AnimActionGoInside()
Go through a nearby door if appropriate. 
int AnimActionGoInside();

### Description
Go through a nearby door if appropriate. This will be done if the door is unlocked and the area the door leads to contains a waypoint with a tag of either NW_TAVERN or NW_SHOP. 
### Remarks
If a call to GetAnimationCondition() returns that the object is already in an inside area, this function will stop. This is to keep the object from going so deep inside a building that they never get out. 
### Requirements
#include " x0_i0_anims " 
### Version
??? 
### See Also
functions:  | AnimActionGoOutside
