<!-- Source: https://nwnlexicon.com/index.php/CheckCharismaMiddle -->

# CheckCharismaMiddle()
Determines if the Charisma score of the speaking player is in the normal range. 
int CheckCharismaMiddle();

### Description
Returns TRUE if the player character in the conversation has a Charisma score greater than 9 and lower than 15. 
### Remarks
Function found in nw_i0_plot.nss on line 622. 
This function always uses GetPCSpeaker() to determine the charisma score, so using it anywhere besides in a conversation will return FALSE. This was used by BioWare to handle different conversation choices for the players depending on how charismatic they were. 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### See Also
functions:  | CheckCharismaLow, CheckCharismaHigh
