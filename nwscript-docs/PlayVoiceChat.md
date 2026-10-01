<!-- Source: https://nwnlexicon.com/index.php/PlayVoiceChat -->

# PlayVoiceChat(int, object)
Plays a voice chat. 
void PlayVoiceChat( int nVoiceChatID, object oTarget = OBJECT_SELF);
#### Parameters 

nVoiceChatID
     VOICE_CHAT_*  

oTarget
    The creature to voice the specified saying. (Default: OBJECT_SELF)
#### Description
Makes oTarget play a voice chat. 
#### Remarks
This will instantly (even during a pause) play the voice chat (sound effect file for that line, if available) and the corresponding text will appear as if SpeakString was used. 
This will not trigger associate commands unlike the player-instigated voice menu, or their associate command radial. 
To queue a voice chat use ActionDoCommand to contain it. There is no action equivalent (which is similar to how the player can spam the voice menu). 
#### Version
1.61 
#### See Also
constants:  |   VOICE_CHAT_* Constants
