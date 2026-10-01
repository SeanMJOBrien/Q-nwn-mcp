<!-- Source: https://nwnlexicon.com/index.php/AdjustReputation -->

# AdjustReputation(object, object, int)
Adjusts, positively or negatively, how a whole faction views a specific person. 
void AdjustReputation( object oTarget, object oSourceFactionMember, int nAdjustment);

### Parameters 

oTarget
    The creature who will be viewed differently by an entire faction. 

oSourceFactionMember
    The member of the faction that will have its opinion changed. 

nAdjustment
    The amount (positive or negative) that the faction's opinion will change.
### Description
Adjust how oSourceFactionMember's faction feels about oTarget by the amount specified in nAdjustment. 
### Remarks
This adjusts Faction Reputation: how the entire faction that oSourceFactionMember is in feels about oTarget. 
One method of maximizing the versatility of the AdjustReputation() function in conjunction with custom factions is to create an inaccesible area devoted to holding custom faction holders. Let's say your custom faction is titled "CLO" . You would give a creature the tag "CustomFactionHolderCLO", set "CLO" as the faction on the creature and place it in the custom faction holder bed. Keep it isolated from all other custom faction holders. Do not check the "plot" flag on your creature or this won't work. You are using a creature rather than a placeable because AdjustReputation() does not work with placeables. Now, for example, if you want the entire custom faction to turn hostile against your PC, you would script: 
AdjustReputation(oPC, GetObjectByTag("CustomFactionHolderCLO"), -100);
You can even create a custom faction holder for a standard faction so that you can easily use AdjustReputation() with that standard faction. 
### Version
1.61 
### Example
// Example OnPhysicalAttacked script for an NPC.// Lowers by 35 points how the attackee's faction views the attacker.void main(){ object oAttacker = GetLastAttacker(); if(GetIsObjectValid(oAttacker)) { AdjustReputation(oAttacker, OBJECT_SELF, -35); }}
### See Also
functions:  | AdjustFactionReputation, SurrenderToEnemies
