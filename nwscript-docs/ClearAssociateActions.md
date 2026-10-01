<!-- Source: https://nwnlexicon.com/index.php/ClearAssociateActions -->

# ClearAssociateActions(object, int)
Clear the actions of one of each type of the PC's associates 
void ClearAssociateActions( object oPC, int bClearCombat = FALSE);

### Parameters 

oPC
    The player character whose associates should have their actions cleared. 

bClearCombat
    Whether to stop combat along with all other actions (Default: FALSE)
### Description
Clear the action queue of one of each type of the PC's associates. Use this to cancel any previous instructions to single associates before assigning new orders. 
Associate types include the henchman, dominated, familiar, summoned and animal companion creatures. 
Unless bClearCombat is TRUE, any current fighting involving the associates will continue. 
### Remarks
Found in x0_i0_partywide.nss, an include library for party-wide functions. 
### Known Bugs
This function does not loop through multiple associates of any particular type. For example, if SetMaxHenchmen() has been used to increase the number of henchmen, ClearAssociateActions() performs a search (GetAssociate()) for only one henchman. 
### Requirements
#include "x0_i0_partywide" 
### Version
1.61 
### See Also  
---
