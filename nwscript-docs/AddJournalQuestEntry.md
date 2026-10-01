<!-- Source: https://nwnlexicon.com/index.php/AddJournalQuestEntry -->

# AddJournalQuestEntry(string, int, object, int, int, int)
Add an entry to a player's Journal. (Create the entry in the Journal Editor first). 
void AddJournalQuestEntry( string sCategoryTag, int nEntryID, object oCreature, int bAllPartyMembers = TRUE, int bAllPlayers = FALSE, int bAllowOverrideHigher = FALSE);

### Parameters 

sCategoryTag
    The tag of the Journal category (case sensitive). 

nEntryID
    The ID of the Journal entry. 

oCreature
    The PC you want to receive the journal entry. 

bAllPartyMembers
    If TRUE, the entry is added to the journal of all of oCreature's Party. (Default: TRUE) 

bAllPlayers
    If TRUE, the entry will show up in the journal of all PCs in the module. (Default: FALSE) 

bAllowOverrideHigher
    If TRUE, override restriction that nState must be > current Journal Entry. (Default: FALSE)
### Description
AddJournalQuestEntry() does exactly what it says - adds an entry to the "Quests" or "Completed Quests" tab of a player's journal. You can set flags to add the entry to a PC alone, all of a PC's party members, or any PC resident in your module. 
The function uses two parameters to refer to a journal entry, sCategoryTag and nEntryID: 
sCategoryTag is the journal category's tag. For example, when I create a quest with the name "Bob's Brilliantine Boots of Butt-kicking", I give it the Tag "isk_jrnl_bbbbk", and use that tag when assigning journal entries along the way. 
iEntryID is the ID of a specific Journal Entry. This is the number you put in the ID box of the Editor, and the number that appears next to the journal entry. By default, journal entry numbers must increase when using AddJournalQuestEntry(). This restriction can be overridden by setting bAllowOverrideHigher to TRUE. 
When this command results in a journal update, the journal category name appears in an anonymous chat message. 
### Remarks
You don't need to create custom scripts to update Journal Entries in conversation. Just use the "Other Actions" tab to pick the journal category and journal entry you want. 
Be careful setting bAllowOverrideHigher to TRUE - it is easily possible to move quests from a later "Completed Quest" entry to an inconsistent earlier "Quests" entry. 
The Journal tab the entry appears on is fixed in the Journal Editor with the "Completed" checkbox. Completed quests go on the "Completed" tab, all others on the "Quests" tab. You cannot add messages to the "User" tab. 
Preceding Journal Entries are automatically removed. If you want to have the effect of Quest stages with the same title, use categories with different tags, but the same Name. 
The override flag could be used effectively in a PvP tournament to keep track of the flow of battle - teams could be updated with their status on a sliding scale as the vicissitudes of war raise them up or bring them down. 
This command does NOT assign XP. To do so, you must use GetJournalQuestExperience(), and GiveXPToCreature(). 
AddJouralQuestEntry() will find a sCategoryTag case-insensitive, but adding the same quest with the capitalization of sCategoryTag different in each one will add a different quest in each (not the same quest). 
To add a journal entry when a PC acquires an item, you need to use this function in the module's OnAcquireItem event script. See the code sample below for an example. 
Whenever a journal entry is set on a PC, a local integer is also set on the same PC with the name of "NW_JOURNAL_ENTRY*" where * is the tag of the journal entry that has been added. The integer value that is set is the quest status number that is set with the journal entry. 
### Bugs
As of NWN:EE version v86.8193.34.1, a bug affects the usage of AddJournalQuestEntry on persistent worlds which use database variables to store players' journal states and use AddJournalQuestEntry in OnClientEnter to restore the journal state after a reset: If the module is restarted (i.e. on server restart), and a player logs in, their journals are updated correctly by the AddJournalQuestEntry calls in OnClientEnter. However, if that player logs out and back in, for any future login that player's journal will appear to be empty (in practice the entries still seem to exist but they simply aren't visible). In your OnClientEnter journal script you therefore need to call RemoveJournalQuestEntry first on each entry, before then re-adding the entry using AddJournalQuestEntry. 
### Version
1.62 
### Example
// For a journal category "isk_jrnl_bbbbk" with 3 entries:// 1 - The starting message// 100 - An intermediate message// 200 - A completion message (flagged "complete" in the Editor)// (assuming oPC is a valid PC object)// In order of execution:// This adds the Journal entry with ID 1 from Journal // Category "isk_jrnl_bbbbk" to the entering PCs Journal. // No other journal is affectedAddJournalQuestEntry("isk_jrnl_bbbbk", 1, oPC, FALSE, FALSE, FALSE);// This updates the only the PC's journal to the Entry with ID 100AddJournalQuestEntry("isk_jrnl_bbbbk", 100, GetEnteringObject(), FALSE, FALSE, FALSE);// These do nothing because the journal was already at entry 100AddJournalQuestEntry("isk_jrnl_bbbbk", 100, oPC, FALSE, FALSE, FALSE);AddJournalQuestEntry("isk_jrnl_bbbbk", 1, oPC, FALSE, FALSE, FALSE);// This adds the quest completion message to the// 'completed Quests' tab of the PC's journalAddJournalQuestEntry("isk_jrnl_bbbbk", 200, oPC, FALSE, FALSE, FALSE);// This removes the quest completed message, and // adds the intermediate stage message to the 'Quests' tab.AddJournalQuestEntry("isk_jrnl_bbbbk", 100, oPC, FALSE, FALSE, TRUE);// ----- Completely different example -----// Adding an entry when picking up an item.// Script goes in the module OnAcquireItem event:// (Courtesy of Thomas Daugaard)//// Modify "my_item_tag" and "my_item_quest" to match the// Tag of the item you're checking for, and the Category Tag of// the appropriate journal entry respectively.void main(){ // Get the object which was acquired object oItemAcquired = GetModuleItemAcquired(); if (oItemAcquired != OBJECT_INVALID) { // Get the tag of the acquired item // If it is "my_item_tag" we got the right item if (GetTag(oItemAcquired ) == "my_item_tag") { // Get the object (player) who now possess the item object oPC = GetItemPossessor(oItemAcquired ); // Add an appropriate journal entry to his journal AddJournalQuestEntry ("my_item_quest", 100, oPC); } }}
//Excerpt from script that runs in a Persistent World's OnClientEnter event//to restore journal entries based on quest campaign variables on a player character//(journal entries being wiped every server reset)//with the required 'RemoveJournalQuestEntry' called before each re-adding of the entry to avoid the invisible entries bug described above int iFirstQuest = GetCampaignInt("JournalEnts", "Quest1", oPC); if( iFirstQuest > 0) { //must remove the quest entry first before re-adding it, to avoid the invisible entries bug RemoveJournalQuestEntry("FirstQuest", oPC, iFirstQuest, FALSE); AddJournalQuestEntry("FirstQuest", iFirstQuest, oPC, FALSE); } int iMQ1 = GetCampaignInt("JournalEnts", "MnQust1", oPC); if( iMQ1 > 0) { RemoveJournalQuestEntry("MainQuest1", oPC, iMQ1, FALSE); AddJournalQuestEntry("MainQuest1", iMQ1, oPC, FALSE); } int iMQ2 = GetCampaignInt("JournalEnts", "MnQust2", oPC); if( iMQ2 > 0) { RemoveJournalQuestEntry("MainQuest2", oPC, iMQ2, FALSE); AddJournalQuestEntry("MainQuest2", iMQ2, oPC, FALSE); } int iMQ3 = GetCampaignInt("JournalEnts", "MnQust3", oPC); if( iMQ3 > 0) { RemoveJournalQuestEntry("MainQuest3", oPC, iMQ3, FALSE); AddJournalQuestEntry("MainQuest3", iMQ3, oPC, FALSE); } int iDP = GetCampaignInt("JournalEnts", "darkpit", oPC); if( iDP > 0) { RemoveJournalQuestEntry("BigBoss1", oPC, iDP, FALSE); AddJournalQuestEntry("BigBoss1", iDP, oPC, FALSE); }
### See Also
functions:  | RewardPartyXP, RemoveJournalQuestEntry  

events:  | OnUserDefined Event
