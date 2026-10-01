<!-- Source: https://nwnlexicon.com/index.php?title=FloatingTextStringOnCreature&amp;action=history -->

# FloatingTextStringOnCreature(string, object, int)
Briefly displays ambient text above targets head and puts it in the chat log. 
void FloatingTextStringOnCreature( string sStringToDisplay, object oCreatureToFloatAbove, int bBroadcastToFaction = TRUE, int bChatWindow = TRUE);
#### Parameters 

sStringToDisplay
    Message to display. 

oCreatureToFloatAbove
    Creature to display the message over. 

bBroadcastToFaction
    If this is TRUE then only creatures in the same faction as oCreatureToFloatAbove will see the floating text, and only if they are within range (30 meters). (Default: TRUE) 

bChatWindow
    If TRUE, sStringToDisplay will be displayed in oCreatureToFloatAbove's chat window. (Default: TRUE)
#### Description
Displays ambient text that floats up into the air above the target creature's head and fades out. It also displays it in the chat log like SendMessageToPC. Unlike SpeakString, the creatures name isn't displayed before the text. However, the visibility of the text is limited (see Remarks below). 
If bBroadcastToFaction is TRUE, the targeted creature and its faction within 30 meters will see the text. If bBroadcastToFaction is FALSE, then only the targeted creature will see it. This is useful to message the entire PCs party about something happening to one of their members (player or companion). 
bChatWindow allows you now to toggle off the notification in the chat window, allowing you to mimic damage feedback and other floaty-text-but-not-in-chat items. 
#### Remarks
This function seems to be most useful for notifying PCs (and possibly their party) of in game effects (detections, environmental perceptions, etc), and not as a way to facilitate PC-to-creature communication. For instance, if a PC passes a Listen check they could be notified via Ambient Text (*You hear footsteps coming down the hall*). Other uses could include Onomatopoeia originating from the PC (*Snap!*, *Cough!*, *Hick!*) and brief game feedback (simulate an overheard conversation, time from a sundial, item status, etc). 
This function will only work on creatures thus not work on placeable objects of any kind, and text targeted to NPCs will never be visible to non-party PCs. You can simulate text coming from a sign, sundial, or any other placeable object by assigning oCreatureToFloatAbove as the PC you want to notify, as long as the PC is near to the object when the text will appear. 
You can change the color of the text shown using StringToRGBString. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. FloatingTextStringOnCreature(), FloatingTextStrRefOnCreature() now have bChatWindow parameter. 
#### Example
// This script is placed in a sundial's OnUsed event// The sundial only works during the day. If it is// day, the sundial will display the time only above// the PC's head.void main(){ // get the user, assume it is a PC object oPC = GetLastUsedBy(); // Check to see if it is day if (GetIsDay()) { // Initialize variables int nHour = GetTimeHour(); string sTime = IntToString(nHour) + " o'clock"; // Display time only above the PC's head FloatingTextStringOnCreature(sTime, oPC, FALSE); } else { // If it is night, tell player he can't determine time FloatingTextStringOnCreature("There is no sun to cast " + "a shadow on the sundial.", oPC, FALSE ); }}
#### See Also
functions:  |  FloatingTextStrRefOnCreature SpeakString StringToRGBString SendMessageToPC
