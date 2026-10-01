<!-- Source: https://nwnlexicon.com/index.php/ClearActions -->

# ClearActions(int, int)
This is a wrapper for ClearAllActions(). 
void ClearActions( int nClearConstant = 0, int bClearCombat = FALSE);

### Parameters 

nClearConstant
    This is not used. (Default: 0) 

bClearCombat
    Stop all current actions, combat optional. (Default: FALSE)
### Description
This is a wrapper for ClearAllActions(). 
### Remarks
This function is basically worthless as is. All it does is call ClearAllActions() and pass along the bClearCombat parameter. You might as well call ClearAllActions() directly. 
The function does contain some debugging code that has been commented out. It looks like at one time BioWare was using this function to try and track down some bugs in the AI. 
### Requirements
#include "x0_i0_assoc" 
### Version
??? 
### See Also
functions:  | ClearAllActions
