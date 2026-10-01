<!-- Source: https://nwnlexicon.com/index.php/AnimActionFindPlaceable -->

# AnimActionFindPlaceable(float)
Find a placeable within the given float distance and interact with it. 
int AnimActionFindPlaceable( float fMaxDistance);

### Parameters 

fMaxDistance
    The DISTANCE_* constant corresponding to the maximum distance to look for an object to interact with.
### Description
Find a placeable within the given distance and interact with it. 
### Remarks
Though fMaxDistance is stated as the "distance", it is not referenced in the actual function. Where I thought to find fMaxDistance referenced I instead found DISTANCE_SHORT. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | AnimActionStopInteracting
