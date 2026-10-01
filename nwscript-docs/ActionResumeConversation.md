<!-- Source: https://nwnlexicon.com/index.php/ActionResumeConversation -->

# ActionResumeConversation()
Resume a conversation after it has been paused. 
void ActionResumeConversation();

### Description
Resume a conversation after it has previously been paused with ActionPauseConversation(). 
### Remarks
If the PC cancelled the conversation (hit escape key, spell casting, etc) while it was being paused, calling this function will still resume it. If this behavior is not desirable, you can code your own by using the "End Conversation Script - Aborted" script. 
If the PC moves out of range of the object it was having a conversation with, it is not possible to resume it. 
### Version
1.22 
### Example
// This example resumes the conversation after casting a healing spell on the PC.// Put this on the Actions Taken tab of an NPC's response to a request for healing.void main(){ object oPC = GetPCSpeaker(); ActionPauseConversation(); ActionCastSpellAtObject(SPELL_GREATER_RESTORATION, oPC, METAMAGIC_ANY, TRUE); ActionResumeConversation();}
### See Also
functions:  | ActionPauseConversation
