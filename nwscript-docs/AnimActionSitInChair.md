<!-- Source: https://nwnlexicon.com/index.php/AnimActionSitInChair -->

# AnimActionSitInChair(float)
Sit in a random nearby chair if available. 
int AnimActionSitInChair( float fMaxDistance);

### Parameters 

fMaxDistance
    Maximum distance within which to search for a chair to sit upon.
### Description
Sit in a random nearby chair if available. Looks for unoccupied objects with the tag "Chair" within fMaxDistance. 
Returns TRUE on success, FALSE on failure. 
### Remarks
You can use the DISTANCE_* constants if you want for fMaxDistance. See remarks section of GetRandomObjectByTag() for the quirks in how the distance is actually used to get an object. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | ActionSit  

constants:  | DISTANCE_*
