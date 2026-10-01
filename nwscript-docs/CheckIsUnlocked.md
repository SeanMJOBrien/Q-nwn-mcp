<!-- Source: https://nwnlexicon.com/index.php/CheckIsUnlocked -->

# CheckIsUnlocked(object)
Plays voice chat messages that indicates the locked status of a door or placeable. 
void CheckIsUnlocked( object oLastObject);

### Parameters 

oLastObject
    The door or placeable to report the locked status of.
### Description
Makes the caller of script do a voice chat that indicates the locked status of a door or placeable. 
(Does not lock or unlock the object and does not make the creature do anything else). 
### Remarks
This function is not used in any Bioware scripts. 
### Requirements
#include "nw_i0_generic" 
### Version
1.22 
### Example
// This is the exact functionvoid CheckIsUnlocked(object oLastObject){ if(GetLocked(oLastObject)) { ActionDoCommand(PlayVoiceChat(VOICE_CHAT_CUSS)); } else { ActionDoCommand(PlayVoiceChat(VOICE_CHAT_CANDO)); }}
### See Also  
---
