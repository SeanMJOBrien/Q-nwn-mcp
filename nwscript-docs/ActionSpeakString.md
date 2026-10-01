<!-- Source: https://nwnlexicon.com/index.php/ActionSpeakString -->

# ActionSpeakString(string, int)
Causes an object to speak. 
void ActionSpeakString( string sStringToSpeak, int nTalkVolume = TALKVOLUME_TALK);
#### Parameters 

sStringToSpeak
    String to be spoken 

nTalkVolume
    A TALKVOLUME_* constant representing the channel on which to speak the string. (Default: TALKVOLUME_TALK)
#### Description
Adds to the caller's action queue an action that will cause the caller to speak sStringToSpeak. nTalkVolume determines how loud the string will be spoken when the action is processed. 
#### Remarks
This differs from SpeakString(), which causes the caller to speak immediately. Note that the caller must have an action queue for this to do anything (for example, triggers do not process actions). 
See SpeakString for more information about talk volumes. 
#### Version
1.22 
#### Example
// Move to a location then shout we've found somethingvoid main(){ object oWP = GetObjectByTag("wp_treasture"); location lDestination = GetLocation(oWP); ActionMoveToLocation(lDestination); ActionSpeakString("Over here, I've found something!", TALKVOLUME_SHOUT);}
#### See Also
functions:  |  SpeakString, ActionSpeakStringByStrRef, SpeakStringByStrRef  

constants:  | TALKVOLUME_* Constants
