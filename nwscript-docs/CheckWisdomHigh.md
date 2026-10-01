<!-- Source: https://nwnlexicon.com/index.php/CheckWisdomHigh -->

# CheckWisdomHigh()
Determines if the Wisdom score of the speaking player is above the low range. 
int CheckWisdomHigh();

### Description
Returns TRUE if the player character in the conversation has a Wisdom score greater than 13. 
### Remarks
Function found in nw_i0_plot.nss on line 743. 
This function always uses GetPCSpeaker() to determine the wisdom score, so using it anywhere besides in a conversation will return FALSE. This was used by BioWare to provide different conversation choices for the players depending on how high their wisdom was. This allowed scripters to give special insight into motives of NPCs during conversations. 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### Example
// If the player has completed the STEAL_DIAMOND quest and they are of normal// Intelligence levels and High Wisdom levels, then let them realize the NPC is// going to kill them to keep them quiet. This will give the player a chance to// react before the encounter begins.#include "nw_i0_plot"int StartingConditional(){ int bCompleted = GetLocalInt(GetModule(), "STEAL_DIAMOND") >= 10; return bCompleted && CheckIntelligenceNormal() && CheckWisdomHigh();}
### See Also
functions:  | CheckIntelligenceHigh
