<!-- Source: https://nwnlexicon.com/index.php/ClearAllFactionMembers -->

# ClearAllFactionMembers(object, object)
Makes an NPC's faction feel friendly towards the PC. 
void ClearAllFactionMembers( object oMember, object oPlayer);

### Parameters 

oMember
    A member of the NPC faction who attitude should be reset. 

oPlayer
    The player towards whom the attitudes should be reset.
### Description
Adjusts all members of oMember's faction group to friendly reputation towards the oPlayer. 
### Remarks
This function is most commonly used to reset the player's reputation after he has been killed. For example, if he mistakenly targeted a town guard with a spell or other attack and caused the town guard to kill him, this could reset things to normal after he respawned. 
If the global flag of a faction is off too, then using this will make sure all the NPCs in that faction react as the adjusted alignment makes them. 
Found on nw_o0_death.nss: line 15. This function is currently commented out as of 1.29. To use it, copy it to your script, or use the code example for the function without having to find the original script. 
See also: David Gaider's Scripting Tutorial Factions, Shouts, and Attacking My Enemy. 
### Requirements
#include "nw_o0_death" 
### Version
1.62 
### Example
// The original function in all its glory. It is here because it is// commented in later versions of the game, but still useful.void ClearAllFactionMembers(object oMember, object oPlayer){ AdjustReputation(oPlayer, oMember, 100); // * Player bad SetLocalInt(oPlayer, "NW_G_Playerhasbeenbad", 10); // Clear all faction members' reputations object oClear = GetFirstFactionMember(oMember, FALSE); while (GetIsObjectValid(oClear) == TRUE) { ClearPersonalReputation(oPlayer, oClear); oClear = GetNextFactionMember(oMember, FALSE); }}
### See Also
functions:  | SetStandardFactionReputation  

events:  | OnPhysicalAttacked Event  
tutorials:  | Factions, Shouts, and Attacking My Enemy
