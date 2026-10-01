<!-- Source: https://nwnlexicon.com/index.php/SetPCChatVolume -->

# SetPCChatVolume

# SetPCChatVolume(int)
Sets the last player chat volume before it gets sent to other players. 
void SetPCChatVolume( int nTalkVolume);
#### Parameters
_nTalkVolume_
The  TALKVOLUME_*  of the chat text to be sent onto other players. 
#### Description
Sets the last player chat (text) volume before it gets sent to other players. 
#### Remarks
Note: The new chat message gets sent after the  OnPlayerChat  script exits. 
#### Version
1.69 
#### Example
See  OnPlayerChat . 
#### See Also
functions:  |   SetPCChatMessage   

constants:  |   TALKVOLUME_*   
events:  |   OnPlayerChat Event
