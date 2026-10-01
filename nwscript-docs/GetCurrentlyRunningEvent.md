<!-- Source: https://nwnlexicon.com/index.php?title=GetCurrentlyRunningEvent&amp;action=history -->

# GetCurrentlyRunningEvent()

Retrieves the currently running event. 
int GetCurrentlyRunningEvent( int bInheritParent = TRUE);
### Parameters 

bInheritParent
    If TRUE, ExecuteScript/ExecuteScriptChunk will inherit their event ID from their parent event. See note below about OnDeath and OnDamaged.     If FALSE, it will return the event ID of the current script, which may be 0.
### Description
Returns the currently executing event (EVENT_SCRIPT_*) or 0 if not determinable. 
Note: Will return 0 in DelayCommand/AssignCommand. 
ExecuteScript/ExecuteScriptChunk will inherit their event ID from their parent event if bInheritParent is TRUE. 
Some events can run in the same script context as a previous event (for example: Creature OnDeath, Creature OnDamaged). In cases like these calling the function with bInheritParent = TRUE will return the wrong event ID. 
### Remarks
This can be useful for determining the event the script is running from to have one script be used for multiple events; this really helps simplify some systems so you only have 1 script to edit not 10 (eg; treasure generation, such as the below example). 
These scripts types cannot be retrieved since they're not true events: 
  * Conversation Conditional Script
  * Conversation Action Script
  * Conversation End Script
  * Conversation Abort Script
  * Spell Script
  * Disease Payload Script
  * nwscript console run scripts
  * Console dm_runscript run scripts
  * EffectRunScript (which has it's own way of identifying the script being run)

### Version
This function was added in 1.83.8193.21 of NWN:EE. 
This function was updated in 1.84.8193.29 of NWN:EE. GetCurrentlyRunningEvent now has param bInheritParent for cases such as Creature OnDeath/OnDamaged returning the wrong event ID otherwise. 
### Example
// Script for both OnOpen and OnDeath// Generate treasure in the case of opening (after it's unlocked) OR destruction, but if destroyed only generate half// Only do this once - track with a localvoid main(){ // Don't generate twice if(GetLocalInt(OBJECT_SELF, "DONE_LOOT")) return; SetLocalInt(OBJECT_SELF, "DONE_LOOT", TRUE); // Generate 3d20 gold int nGoldAmount = d20(3); int nEvent = GetCurrentlyRunningEvent(); if(nEvent == EVENT_SCRIPT_PLACEABLE_ON_DEATH) { // Half amount nGoldAmount /= 2; // Feed back damage to killer SendMessageToPC(GetLastKiller(), "Your reckless destruction of " + GetName(OBJECT_SELF) + " has damaged some of the contents."); } // Create the gold CreateItemOnObject("nw_it_gold001", OBJECT_SELF, nGoldAmount);}
### See Also
functions:  |  DelayCommand AssignCommand ExecuteScript ExecuteScriptChunk  

constants:  |  EVENT_SCRIPT_*  
events:  |
