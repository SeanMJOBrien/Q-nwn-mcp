<!-- Source: https://nwnlexicon.com/index.php/CheckIntelligenceLow -->

# CheckIntelligenceLow()
Determines if the Intelligence score of the speaking player is below 9. 
int CheckIntelligenceLow();

### Description
Returns TRUE if the player character in the conversation has an intelligence lower than 9. 
### Remarks
This function always uses GetPCSpeaker() to determine the intelligence score, so using it anywhere besides in a conversation will return FALSE. This was used by BioWare to handle different conversation choices and provide small insults for those characters who were of low intelligence. 
nw_i0_plot.nss: 57 
### Requirements
#include "nw_i0_plot" 
### Version
1.28 
### Example
// Add as a starting conditional on a conversation thread for a quest-giving NPC// who expects the player to return a stolen item. If they talk to him again// without having the diamond and they also have a low intelligence score, he// will call them idiots and tell them to get back out there and try again.#include "nw_i0_plot"int StartingConditional(){ object oPC = GetPCSpeaker(); // If the PC has gotten the quest... if (GetLocalInt(oPC, "STEAL_DIAMOND_QUEST")) { int bHasDiamond = GetIsObjectValid(GetItemPossessedBy(oPC, "StolenDiamond")); // If the PC does not have the diamond and it stupid, yell at him. return !bHasDiamond && CheckIntelligenceLow(); } // The PC doesn't have the quest yet, so don't yell at him. return FALSE;}
### See Also
functions:  | CheckIntelligenceHigh, CheckIntelligenceNormal
