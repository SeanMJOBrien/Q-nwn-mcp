<!-- Source: https://nwnlexicon.com/index.php/ChangeToStandardFaction -->

# ChangeToStandardFaction(object, int)
Changes a creature's faction to one of the four standard factions. 
void ChangeToStandardFaction( object oCreatureToChange, int nStandardFaction);
### Parameters 

oCreatureToChange
    A creature whose faction you will alter. 

nStandardFaction
    A STANDARD_FACTION_* constant representing the faction to join.
### Description
Make oCreatureToChange join one of the standard factions ("Hostile", "Commoner", "Merchant", or "Defender"). 
### Remarks
Changing factions does not trigger combat automatically. Execute the creatures combat script to have combat be initiated instead. See the example for how to do this. 
To assign a creature to a non-standard faction, use ChangeFaction() instead. 
Although placeables, triggers, doors etc. have factions (for traps to be triggered primarily), they cannot be used as oCreatureToChange. They also do not work with ChangeFaction. Therefore these objects cannot be changed. 
PCs cannot change factions, nor can anyone with a master (check with GetMaster) who follow their masters faction state. 
### Version
1.22 
### Example
// In the "Actions Taken" script of an NPC's final conversation node.// This will make the NPC attack the PC.void main(){ ChangeToStandardFaction(OBJECT_SELF, STANDARD_FACTION_HOSTILE); ExecuteScript(GetEventScript(OBJECT_SELF, EVENT_SCRIPT_CREATURE_ON_END_COMBATROUND), OBJECT_SELF);}
### See Also
functions:  | ChangeFaction  

constants:  | STANDARD_FACTION_* Constants
