<!-- Source: https://nwnlexicon.com/index.php/GetPCSpeaker -->

# GetPCSpeaker()
Retrieves the PC that is currently in a conversation with an NPC. 
object GetPCSpeaker();
#### Description
Returns the PC that is speaking in the current conversation. 
It will return OBJECT_INVALID if there is no PC speaker, for example, with SpeakOneLinerConversation(). 
#### Remarks
This function can only be used in scripts that are called as part of a conversation, and always returns the PC talking. 
Of course, if it is an NPC speaking to another NPC, it will return the NPC who is the one who takes the conversation choices (NPC's always take the first one after a short delay). 
#### Version
1.28 
#### Example
// An "Actions Taken" script to set a quest variable on the PC// in an NPC conversationvoid main() { object oPC = GetPCSpeaker(); SetLocalInt( oPC, "golden_duck", 100);}// --- end of the 'Actions Taken' example.// a StartingConditional for the "Text Appears When"// script of an NPC conversation. The conversation node// this script is attached to will only appear when the PC// variable "golden_duck" has set to 100.int StartingConditional() { object oPC = GetPCSpeaker(); int nDuckState = GetLocalInt( oPC, "golden_duck"); if (100 == nDuckState) return TRUE; return FALSE;}
#### See Also
functions:  |   GetLastSpeaker  SpeakOneLinerConversation BeginConversation ActionStartConversation  

events:  |   OnConversation Event
