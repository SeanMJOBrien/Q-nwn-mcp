<!-- Source: https://nwnlexicon.com/index.php/CanCreatureBeDestroyed -->

# CanCreatureBeDestroyed(object)
Returns TRUE if the target creature is allowed to die. 
int CanCreatureBeDestroyed( object oTarget);

### Parameters 

oTarget
    The object whose flags you wish to check.
### Description
Returns TRUE if oTarget's plot and immortal flags are both off (FALSE). 
Returns FALSE if either of oTarget's plot or immortal flags are set (TRUE). 
### Requirements
#include "x0_i0_spells" 
### Version
??? 
### See Also
functions:  | GetPlotFlag
