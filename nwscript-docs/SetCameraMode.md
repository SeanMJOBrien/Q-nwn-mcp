<!-- Source: https://nwnlexicon.com/index.php/SetCameraMode -->

# SetCameraMode

# SetCameraMode(object, int)
Changes the perspective view of the player on the screen. 
void SetCameraMode( object oPlayer, int nCameraMode);
#### Parameters
_oPlayer_
PC mode change to occur to. 
_nCameraMode_
 CAMERA_MODE_* 
#### Description
Set the camera mode for oPlayer. If oPlayer is not player-controlled or nCameraMode is invalid, nothing happens. 
#### Version
1.22 
#### See Also
functions:  |   StoreCameraFacing   

constants:  |   CAMERA_MODE_* Constants
