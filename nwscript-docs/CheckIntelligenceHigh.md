<!-- Source: https://nwnlexicon.com/index.php/CheckIntelligenceHigh -->

# CheckIntelligenceHigh()
Determines if the Intelligence score of the speaking player is above 14. 
int CheckIntelligenceHigh();

### Description
Returns TRUE if the player character in the conversation has an intelligence higher than 14. 
### Remarks
Function found in nw_i0_plot.nss on line 728. 
This function always uses GetPCSpeaker() to determine the intelligence score, so using it anywhere besides in a conversation will return FALSE. This was used by BioWare to handle different conversation choices for the players depending on how intelligent they were. 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### Example
// Add as a starting conditional on a conversation thread for a Wizard who will// not bother talking to anyone unless they are exceptionally bright.#include "nw_i0_plot"int StartingConditional(){ return CheckIntelligenceHigh();}
### See Also
functions:  | CheckIntelligenceLow, CheckIntelligenceNormal
