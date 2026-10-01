<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomInteractAnimation -->

# AnimActionPlayRandomInteractAnimation(object)
Interact with a placeable object. 
void AnimActionPlayRandomInteractAnimation( object oPlaceable);

### Parameters 

oPlaceable
    The object to interact with.
### Description
Interact with a placeable object. This will activate/deactivate the placeable object if a valid one is passed in. 
**KLUDGE** : Because of placeables (like the trap doors, etc.) that should be "opened" rather than "activated", but don't have an inventory, Bioware uses what they call an "ugly hack". Set the "Will" saving throw of a placeable to the value 1 if it should be opened rather than activated. 
### Remarks
Uses a random 5. If the random comes up as 0, then the animation will be a head scratch. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  |  AnimActionStopInteracting
