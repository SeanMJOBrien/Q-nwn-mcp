<!-- Source: https://nwnlexicon.com/index.php/CheckCharismaHigh -->

# CheckCharismaHigh()
Determines if the Charisma score of the speaking player is above 14. 
int CheckCharismaHigh();

### Description
Returns TRUE if the player character in the conversation has a charisma higher than 14. 
### Remarks
Function found in nw_i0_plot.nss on line 675. 
This function always uses GetPCSpeaker() to determine the Charisma score, so using it anywhere besides in a conversation will return FALSE. This was used by BioWare to handle different conversation choices for the players depending on how charismatic they were. 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### Example
// Add as a starting conditional on a conversation thread for a tavern flirt who// will hit on anyone with a high enough charisma.#include "nw_i0_plot"int StartingConditional(){ int bGoodLooker = CheckCharismaHigh(); return bGoodLooker;}
### See Also
functions:  | CheckCharismaLow, CheckCharismaMiddle
