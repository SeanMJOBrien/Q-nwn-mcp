<!-- Source: https://nwnlexicon.com/index.php/CanSeePlayer -->

# CanSeePlayer()
Determines if a creature can see a PC. 
int CanSeePlayer();

### Description
Returns TRUE if OBJECT_SELF can see a PC (any PC), otherwise FALSE. 
### Remarks
This function is simply a wrapper for GetNearestCreature() used for convenience and clearer code. 
### Requirements
#include "nw_i0_plot" 
### Version
1.22 
### See Also  
---
