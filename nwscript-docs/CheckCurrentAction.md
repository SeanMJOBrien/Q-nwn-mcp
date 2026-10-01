<!-- Source: https://nwnlexicon.com/index.php/CheckCurrentAction -->

# CheckCurrentAction()
Checks to see if we're in the middle of some action so we do not interrupt or pile actions onto the queue. 
int CheckCurrentAction();

### Description
Check to see if we're in the middle of some action so we do not interrupt or pile actions onto the queue. 
### Remarks
If the caller is sitting, there is a one in ten chance calling this function will make them stand up. 
Returns TRUE if the caller is sitting or GetCurrentAction() returns something other than ACTION_INVALID. Every other condition will return FALSE. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | GetCurrentAction
