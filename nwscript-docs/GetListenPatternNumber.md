<!-- Source: https://nwnlexicon.com/index.php/GetListenPatternNumber -->

# GetListenPatternNumber

# GetListenPatternNumber()
Check if a conversation pattern has been activated in an OnConversation event. 
int GetListenPatternNumber();
#### Description
Returns an integer describing the listen pattern that has been activated. This appears to be any valid integer (assumed > -1). This function can only be used during an OnConversation event. Listen patterns are set using the SetListenPattern function, then checked for when the object is listening (set using SetListening). If the function SetListenPattern has the string ATTACK with the value 10 attached, when the string ATTACK is shouted (and thereby the OnConversation event is triggered) the function GetListenPatternNumber will return a 10. If no pattern is found a value of -1 will be returned. If multiple patterns match, the highest matching number is returned. 
#### Remarks
This function seems to be mainly used to help NPCs perform group actions (e.g. guards attacking) and other NPC actions (e.g. following). It can also be used for passwords and riddles. 
#### Version
1.22 
#### Example
// Attach these functions to an NPC. // Enter the game world // Shout WOOT to trigger the message YEAH IT WORKS". // OnSpawnvoid main(){ SetListening(OBJECT_SELF,TRUE); SetListenPattern(OBJECT_SELF,"WOOT",2001);}// OnConversationvoid main(){ int nMatch = GetListenPatternNumber(); if(nMatch == 2001) SpeakString("YEAH IT WORKS");}
#### See Also
functions:  |   SetListenPattern
