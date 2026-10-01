<!-- Source: https://nwnlexicon.com/index.php/ActionPauseConversation -->

# ActionPauseConversation()
Pause the current conversation. 
void ActionPauseConversation();

### Description
Pause the current conversation at the node in the conversation file which called this function from its Action Taken script. 
### Remarks
You must call this function with the caller having an empty action queue, otherwise it will have no effect. Use ClearAllActions() for this, if calling ActionPauseConversation() has no effect. 
If you pause the conversation at a PC response node, the PC's choice will be highlighted until you call ActionResumeConversation(), the PC cancels the conversation, or the PC runs out of range. 
### Version
1.22 
### Example
// This example pauses the conversation to cast a healing spell on the PC. Place// this on the Actions Taken tab of the NPC's response to a request for healing.void main(){ object oPC = GetPCSpeaker(); ActionPauseConversation(); ActionCastSpellAtObject(SPELL_GREATER_RESTORATION, oPC, METAMAGIC_ANY, TRUE); ActionResumeConversation();}
### See Also
functions:  | ActionResumeConversation
