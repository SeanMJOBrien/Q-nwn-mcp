<!-- Source: https://nwnlexicon.com/index.php/BeginConversation -->

# BeginConversation(string, object)
Attempts to start a conversation immediately. 
int BeginConversation( string sResRef = "", object oObjectToDialog = OBJECT_INVALID);
### Parameters 

sResRef
    If this is not specified, the default dialog file will be used. (Default: "") 

oObjectToDialog
    If this is not specified, the object that triggered the event will be used. (Default: OBJECT_INVALID)
### Description
This function is normally used at the (logical) end of an OnConversation script to start the desired conversation. It can be used elsewhere, but ActionStartConversation() may be more appropriate. 
If sResRef is unspecified, the engine refers to the properties of the object executing this command. If there is a conversation property set, that conversation will be used. 
By default, the function uses the triggering object of the containing event (ie; GetLastSpeaker) as the second parameter. 
It also implicitly causes the creature to call ClearAllActions and SetFacing to face oObjectToDialog. This means they stop animations, ActionSit and so forth, but these can be redone right after and the client won't see any change. 
### Remarks
Either the executing object or the oObjectToDialog must be a PC. 
### Example
// This script goes in an NPC's OnConversation event. It chooses a different // conversation file depending on the area the NPC is found in.void main(){ // Get the area tag string sAreaTag = GetTag(GetArea(OBJECT_SELF)); // Declare a variable for the conversation ResRef string sConversation; // Assign the right conversation by area if (sAreaTag == "isk_a_rangersrest") sConversation = "rangers_potboy"; else if (sAreaTag == "isk_a_goldengoblin") sConversation = "ggoblin_thief"; else if (sAreaTag == "isk_a_sewer1") sConversation = "assassin_servant"; // Start the appropriate conversation. BeginConversation(sConversation);}
### See Also
functions:  | ActionStartConversation  

events:  | OnConversation Event
