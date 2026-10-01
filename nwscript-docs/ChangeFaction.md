<!-- Source: https://nwnlexicon.com/index.php/ChangeFaction -->

# ChangeFaction(object, object)
Change a creature's faction to that of another. 
void ChangeFaction( object oObjectToChangeFaction, object oMemberOfFactionToJoin);
### Parameters 

oObjectToChangeFaction
    The creature whose faction is to change. 

oMemberOfFactionToJoin
    The creature whose faction will be joined.
### Description
Make oObjectToChangeFaction join the faction of oMemberOfFactionToJoin. 
### Remarks
This is how you work with custom factions - there is no "ChangeToCustomFaction" function to do it by some ID number. 
Although placeables, triggers, doors etc. have factions (for traps to be triggered primarily), they cannot be used as oMemberOfFactionToJoin or oObjectToChangeFaction. Therefore these objects cannot be changed. 
PCs cannot change factions, nor can anyone with a master (check with GetMaster) who follow their masters faction state. 
Most modules that make use of this will have a hidden inaccessible area with various faction members with no AI, which can be found by some kind of standard tag (eg: "FACTION_ORCS" as the tag). 
If you stick to standard factions use ChangeToStandardFaction instead. 
### Version
1.61 
### Example
// Used in an "Actions Taken" conversation node when a PC// has persuaded an NPC to join an interesting convent...void main(){ object oNun = GetObjectByTag("SisterOfPerpetualIndulgence"); ChangeFaction(OBJECT_SELF, oNun);}
### See Also
functions:  | ChangeToStandardFaction
