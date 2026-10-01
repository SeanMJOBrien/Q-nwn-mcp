<!-- Source: https://nwnlexicon.com/index.php/AdjustReputationWithFaction -->

# AdjustReputationWithFaction(object, object, int)
Adjusts the reputation of each member in oPC's party with oNPC's faction. 
void AdjustReputationWithFaction( object oPC, object oNPC, int nAdjustment);

### Parameters 

oPC
    The player character whose party's reputation should be adjusted. 

oNPC
    An NPC member of the faction whose opinion of oPC's party will be changed. 

nAdjustment
    The amount (positive or negative) to adjust the reputation by.
### Description
Adjusts the reputation of each member of the PC's party, including associates, with all members of the NPC's faction by the specified amount, between 100 and -100. 
### Remarks
To adjust the reputation of two non-player factions, use AdjustFactionReputation() instead. 
Found in x0_i0_partywide, an include library for party-wide functions. NOTE: this library is included in x0_i0_common already. Do NOT include both files or you will get errors! 
### Requirements
#include "x0_i0_partywide" 
### Version
1.61 
### Example
#include "x0_i0_partywide"// This script, when placed on the "Actions Taken" node of a conversation, will// increase the PC speaker's party's reputation with the NPC's faction by 10.void main(){ object oPC = GetPCSpeaker(); AdjustReputationWithFaction(oPC, OBJECT_SELF, 10);}
### See Also  
---
