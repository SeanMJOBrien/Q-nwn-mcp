<!-- Source: https://nwnlexicon.com/index.php/CheckCharismaLow -->

# CheckCharismaLow()
Determines if the Charisma score of the speaking player is below 10. 
int CheckCharismaLow();

### Description
Returns TRUE if the player character in the conversation has an charisma lower than 10. 
### Remarks
Function can be found in nw_i0_plot.nss on line 658. 
This function always uses GetPCSpeaker() to determine the charisma score, so using it anywhere besides in a conversation will return FALSE. 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### Example
// Add as a starting conditional on a conversation thread for a // negative NPC reaction#include "nw_i0_plot"int StartingConditional(){ int bUglyLooker = CheckCharismaLow(); return bUglyLooker;}
### See Also
functions:  | CheckCharismaMiddle, CheckCharismaHigh
