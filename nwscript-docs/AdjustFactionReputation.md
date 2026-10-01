<!-- Source: https://nwnlexicon.com/index.php/AdjustFactionReputation -->

# AdjustFactionReputation(object, object, int)
Adjusts all faction members' reputations in relation to another faction. 
void AdjustFactionReputation( object oTargetCreature, object oMemberOfSourceFaction, int nAdjustment);

### Parameters 

oTargetCreature
    The creature whose faction members will be viewed differently by an entire faction. 

oMemberOfSourceFaction
    The member of the faction that will have its opinion changed. 

nAdjustment
    The amount (positive or negative) that the factions opinion will change.
### Description
Adjusts all faction members' reputations with another faction. Pass in a member from each faction. 
### Remarks
To change how a faction feels about a single PC, use AdjustReputation() instead. To adjust how a faction feels about everyone in a PC's party, use AdjustReputationWithFaction() instead. 
### Requirements
#include "nw_i0_plot" 
### Version
1.22 
### Example
// This example shows how a persistent world might set faction reputations to a// persistently stored value. We have two factions, the Bandits and the// Marauders, each represented by a faction focus (a member of the faction with// a tag we know that we've placed in an area inaccessible to PCs for just this// purpose).#include "nw_i0_plot"void main(){ // Get the faction focus objects object oBandit = GetObjectByTag("Faction_Focus_Bandit"); object oMarauder = GetObjectByTag("Faction_Focus_Marauder"); // Get how the bandits and marauders feel about each other now. int nReputationWithBandits = GetReputation(oMarauder, oBandit); int nReputationWithMarauders = GetReputation(oBandit, oMarauder); // Get how the Bandits should feel about the Marauders and vice versa. This // info is set by any script that persistently adjusts how the factions feel // about each other. int nStoredReputationWithBandits = GetCampaignInt("MyCampaign", "Reputation_Bandits_Marauders"); int nStoredReputationWithMarauders = GetCampaignInt("MyCampaign", "Reputation_Marauders_Bandits"); // Adjust the reputations to the desired values. AdjustFactionReputation(oMarauder, oBandit, nStoredReputationWithBandits - nReputationWithBandits); AdjustFactionReputation(oBandit, oMarauder, nStoredReputationWithMarauders - nReputationWithMarauders);}
### See Also
functions:  | AdjustReputationWithFaction, AdjustReputation
