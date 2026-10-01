<!-- Source: https://nwnlexicon.com/index.php/CheckIntelligenceNormal -->

# CheckIntelligenceNormal()
Determines if the Intelligence score of the speaking player is greater than 8. 
int CheckIntelligenceNormal();

### Description
Returns TRUE if the player character in the conversation has an intelligence greater than 8. 
### Remarks
Function found in nw_i0_plot.nss on line 709. 
This function always uses GetPCSpeaker() to determine the intelligence score, so using it anywhere besides in a conversation will return FALSE. This was used by BioWare to handle different conversation choices for the players depending on how intelligent they were. 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### Example
// Add as a starting conditional on a conversation thread for an NPC who refuses// to talk to low intelligence players.#include "nw_i0_plot"int StartingConditional(){ return CheckIntelligenceNormal();}
### See Also
functions:  | CheckIntelligenceHigh, CheckIntelligenceLow
