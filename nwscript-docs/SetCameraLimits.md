<!-- Source: https://nwnlexicon.com/index.php/SetCameraLimits -->

# SetCameraLimits(object, float, float, float, float)

Sets oPlayer's camera limits that override any client configuration limits. 
void SetCameraLimits( object oPlayer, float fMinPitch = -1.0, float fMaxPitch = -1.0, float fMinDist = -1.0, float fMaxDist = -1.0);
#### Parameters 

oPlayer
    The player for whom the camera limits will be set. 

fMinPitch
    The minimum camera pitch to set on the player. 

fMaxPitch
    The maximum camera pitch to set on the player. 

fMinDist
    The minimum camera distance to set on the player. 

fMaxDist
    The maximum camera distance to set on the player.
#### Description
Sets oPlayer's camera limits that override any client configuration limits. Values of -1.0 means use the client configuration instead. 
NB: Like all other camera settings, this is not saved when saving the game. 
#### Remarks
Since it is not saved to the save game file, set it again in OnModuleLoad (which runs on save game load too). 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  AttachCamera() SetCameraFlags
