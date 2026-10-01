<!-- Source: https://nwnlexicon.com/index.php/SetCameraFlags -->

# SetCameraFlags(object, int)

Sets oPlayer's camera settings that override any client configuration settings. 
void SetCameraFlags( object oPlayer, int nFlags=0);
#### Parameters 

oPlayer
    The player to set camera flags for. 

nFlags
    A bitmask of CAMERA_FLAG")_* constants.
#### Description
Sets oPlayer's camera settings that override any client configuration settings 
nFlags is a bitmask of CAMERA_FLAG_* constants; 
NB: Like all other camera settings, this is not saved when saving the game. 
#### Remarks
Since it is not saved to the save game file, set it again in OnModuleLoad (which runs on save game load too). 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  CAMERA_FLAG_* Constants ")  

functions:  |  AttachCamera() SetCameraLimits
