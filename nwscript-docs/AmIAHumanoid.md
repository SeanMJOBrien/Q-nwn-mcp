<!-- Source: https://nwnlexicon.com/index.php/AmIAHumanoid -->

# AmIAHumanoid(object)
Returns TRUE if the target is a humanoid. 
int AmIAHumanoid( object oTarget);

### Parameters 

oTarget
    The creature to determine if it is a humanoid.
### Description
Returns TRUE if oTarget is one of the humanoid races. FALSE if it's not. The term "humanoid" refers to any being whose body structure resembles that of a human. In NWN those are all player races, goblinoids, orcs, monstrous, and reptilians. 
### Remarks
Refers to RACIAL_TYPE_* constants. 
This function **should** be Custom Content compatible. 
### Requirements
#include "nw_i0_spells" 
### Version
??? 
### See Also
functions:  | GetSubRace  

constants:  | RACIAL_TYPE_*
