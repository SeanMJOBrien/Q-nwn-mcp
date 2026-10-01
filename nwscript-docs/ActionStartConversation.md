<!-- Source: https://nwnlexicon.com/index.php/ActionStartConversation -->

# ActionStartConversation(object, string, int, int)
NPC action to start a conversation with a PC. 
void ActionStartConversation( object oObjectToConverseWith, string sDialogResRef = "", int bPrivateConversation = FALSE, int bPlayHello = TRUE);
### Parameters 

oObjectToConverseWith
    An object to converse with. 

sDialogResRef
    The resource reference (filename) of a conversation. (Default: "") 

bPrivateConversation
    Specify whether the conversation is audible to everyone or only to the PC. (Default: FALSE) 

bPlayHello
    Determines if the initial greeting is played. (Default: TRUE)
### Description
Using this function in a script adds ActionStartConversation to the action subject's Action Queue. 
When an object executes ActionStartConversation, it attempts to use the dialogue file specified as sDialogResRef to start conversing with the target, oObjectToConverseWith. If the target is not a PC, the target's OnConversation event fires. 
sResRef is the filename resource reference of a conversation file. If sResRef is not specified, the default conversation of whichever object is not the PC is used (set in its properties in the Toolset). 
If bPrivateConversation is TRUE, the conversation remains between the PC and the other object; nothing else can see the text appearing. If it's FALSE (default), the conversation is broadcast as chat, and "audible" to other players. 
bPlayHello determines whether VOICE_CHAT_HELLO is played by the NPC when a conversation is started. Obviously, this only applies to creatures with soundsets. 
### Remarks
_Note:_ Most of these comments below are generic information about interactive conversations. 
PCs can have dialogue with NPCs, placeables, triggers, and doors. Items cannot converse (but invisible placeables with the same name as an item can). A PC can converse with himself, but not with other PCs. 
If the action subject is mobile, it will attempt to run to oObjectToConverseWith and begin conversation, but will give up if another action is added to its queue. 
Any immobile object in a conversation must be within the PC's camera view (approximately 10 meters when the camera is auto-zoomed in). If you try to start a conversation between a door and a PC and the door is more than 10 meters away, the conversation box will appear briefly and then close immediately, although the door's first line will appear in the PC's chat window. 
Unreliable results can occur from using AssignCommand() to add ActionStartConversation() to a PC's action queue, since players' normal movement commands are very likely to cancel the action. You can get around this with a variety use of SetCommandable and ClearAllActions. 
sResRef is the filename of the conversation file, which is the string that appears in the Module Contents' "Conversations" chooser. 
PCs do not have the OnConversation event except in NWN:EE (experimentations on it would be interesting), and do not have a default conversation file. In these cases an NPC using ActionStartConversation(oPC) will cause the nw_g0_conversat script to fire which just simply calls BeginConversation. This appears to retain the bPrivateConversation parameter if you wanted to use it - but do not edit nw_g0_conversat since it'll just fire this action back and forth. 
It is not possible at present to control the automatic camera zoom in a script (it is an option to stop zoom in on the conversation, or it can be disabled as a player option). 
You can make a PC talk with "itself" by telling the PC to talk to itself, IE: AssignCommand(oPC, ActionStartConversation(oPC, "converse", TRUE));. It is always a good idea for bPrivateConversation to be TRUE in these cases as usually it seems odd when a PC talks to themselves! 
If the conversation only has a single line, the NPC will speak this line, but the dialog box will not appear. If the one-liner conversation owner is a placeable or a door, the line will not spoken. Placeables and doors can still speak one-liners with SpeakString(). 
#### Cancelling Conversations
Being in an interactive conversation is not considered an action by the game. It is a kind of extra GUI layer. Actions while in a conversation can be performed (and are necessary to perform emotes, or have a temple cleric "cast spells" (even fake ones), and won't cancel it. So it raises a question: can we cancel the conversation? 
The basic way a conversation will be cancelled is if a participant moves away or is killed/destroyed (or does something like enters combat, usually...). However you can't to do this for a player-self conversation. You can also start a new conversation but this...starts a new one, and therefore still has them in "conversation mode". 
Therefore you can use this code to cancel an ongoing conversation entirely and not pop a new one up. **Warning:** When it closes the current one it does run the abort script! 
AssignCommand(oPC, ActionStartConversation(oPC, "", TRUE, FALSE));
This operates on the knowledge the PC never has a valid default conversation, thus one can never be loaded. A similar effect will occur when using an invalid resref. 
_Note:_ Jasperre hasn't got time to test but this code may be even better, which avoids an action (which PCs can easily stop occuring). However it might have side effects (does it fire the default voicechat? does it even interrupt an ongoing conversation?) 
void BlankConversation(object oPC){ BeginConversation("", oPC);}AssignCommand(oPC, BlankConversation(oPC));
### Known Bugs
Prior to patch 1.28, ActionStartConversation caused a crash when it was assigned to an area or module. 
A previous note about bPrivateConversation was misleading; it IS now bPrivateConversation, and the comment been removed from the remarks. 
### Version
1.62 
### Example
// --- NPCs ----/* * In the OnPerception event of an NPC, this will cause the * NPC to start the "q_dragnbone" conversation * default conversation with the first PC it perceives. The * conversation will only be heard by the PC */ActionStartConversation(GetLastPerceived(), "q_dragnbone");// --- Placeables ---/* * In the OnUsed event of a non-static placeable, this will * start the placeable's default conversation (set on the * advanced tab of Placeable Properties) with a PC that * uses the placeable. */ActionStartConversation(GetLastUsedBy());/* * In the OnUsed event of a non-static placeable, this will * start the conversation in a file called "offer_healing" * with the PC that used the placeable. Other Players will * be able to hear the conversation */ActionStartConversation(GetLastUsedBy(), "offer_healing", TRUE);// --- Triggers ---/* * In the OnEnter script of a trigger, this will cause an * entering PC to try start the "odd_voice" conversation * with the trigger. Only the PC entering will hear the * conversation. Player movement may cancel this * conversation before it begins, however. */ActionStartConversation(GetEnteringObject(), "odd_voice");/* * In the OnEnter script of a trigger, an NPC with the * tag "rat_boy" will run towards the PC and attempt to * start his default conversation. The conversation will * be audible to others. Also, Rat Boy's OnConversation * event will fire, and if present, should conclude with * BeginConversation. If a different conversation resref is * set during the execution of the OnConversation script, * that conversation will be begun. */object oBoy = GetObjectByTag("rat_boy");object oPC = GetEnteringObject();AssignCommand(oBoy, ActionStartConversation(oPC, "", TRUE));
### See Also
functions:  | BeginConversation, PersistentConversationAttempt  

constants:  | VOICE_CHAT_* Constants
