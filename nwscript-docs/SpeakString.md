<!-- Source: https://nwnlexicon.com/index.php/SpeakString -->

# SpeakString(string, int)
Forces an object to immediately speak. 
void SpeakString( string sStringToSpeak, int nTalkVolume = TALKVOLUME_TALK);

#### Parameters 

sStringToSpeak
    Text to be spoken. 

nTalkVolume
     TALKVOLUME_TALK 
#### Description
The caller will immediately speak sStringToSpeak. nTalkVolume determines how loud the string will be spoken. 
#### Remarks
The caller cannot be a generic trigger. If it is, nothing will happen. If you wish to display text with a trigger, either have the trigger display the text over the PC's head (e.g. with FloatingTextStringOnCreature) or create a non-static invisible object that can speak the text. This differs from ActionSpeakString() which causes an action to be added to the Action Queue. 
The talk volumes determine who can hear the string spoken - they are similar in the way a PC can choose the voice channel to use to speak in: 
  * The SHOUT is the same as PC's shout channel, and is spoken to the entire module in yellow.
  * SILENT_SHOUT is the DM channel, although NPC's can also hear it throughout a module, normal PC's cannot.
  * SILENT_TALK is used for AI-speakstrings, and have the same range as TALK, but PC's cannot see them.
  * TALK is spoken to those who can hear the person talking (or are within a certain distance). This is in white, normal speaking.
  * WHISPER is heard only by people very near the speaker, and is normally in dark grey.

There is no way to have a PC or NPC speak in "Party" chat, for some reason. 
You can change the color of the text shown using StringToRGBString. 
#### Version
1.62 
#### Example
// Make the NPC speak a strange set of words// each heartbeat, using DelayCommand().void main(){ // Speak some strange song, which doesn't rhyme or make sense, or // maybe this is the only line that does. SpeakString("I like to dance I do..."); // Add some goo in there DelayCommand(2.0, SpeakString("However, I also must make some goo...")); // Needed Arbitrary appearance of Foo' from A-team DelayCommand(2.0, SpeakString("Because there isn't any foo'!"));}
#### See Also
functions:  |   FloatingTextStringOnCreature   

constants:  |   TALKVOLUME_* Constants
