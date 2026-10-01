<!-- Source: https://nwnlexicon.com/index.php/AnimDebug -->

# AnimDebug(string)
Debugging function. 
void AnimDebug( string sMsg);

### Parameters 

sMsg
    Message to speak and print.
### Description
Debugging function. 
### Remarks
NOTE: The contents of this function have been commented out. So it will do nothing when called. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### Example
// The source code from x0_i0_anims (line 417) for this function is as follows:void AnimDebug(string sMsg){ //ActionSpeakString("ANIM: " + GetName(OBJECT_SELF) + " " + sMsg); //PrintString("ANIM: " + GetName(OBJECT_SELF) + ": " + sMsg);}
### See Also
functions:  | WriteTimestampedLogEntry
