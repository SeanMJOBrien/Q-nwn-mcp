<!-- Source: https://nwnlexicon.com/index.php/SetCameraFacing -->

# SetCameraFacing

# SetCameraFacing(float, float, float, int)
Changes the direction the player's camera is facing. 
void SetCameraFacing( float fDirection, float fDistance = -1.0, float fPitch = -1.0, CAMERA_TRANSITION_TYPE_SNAP);
#### Parameters
_fDirection_
degrees of rotation from East (0.0f). 
_fDistance_
Distance (zoom) of the camera (Default: -1.0) 
_fPitch_
Pitch (angle) of the camera (Default: -1.0) 
_nTransitionType_
Determines how smoothly the transition occurs (one of the CAMERA_TRANSITION_TYPE_* constants) (Default:  CAMERA_TRANSITION_TYPE_SNAP ) 
#### Description
Change the direction in which the camera is facing - fDirection is expressed as anticlockwise degrees from Due East. (0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South) A value of -1.0f for any parameter will be ignored and instead it will use the current camera value. This can be used to change the way the camera is facing after the player emerges from an area transition. - nTransitionType: CAMERA_TRANSITION_TYPE_* SNAP will immediately move the camera to the new position, while the other types will result in the camera moving gradually into position. Pitch and distance are limited to valid values for the current camera mode: Top Down: Distance = 5-20, Pitch = 1-50 Driving camera: Distance = 6 (can't be changed), Pitch = 1-62 Chase: Distance = 5-20, Pitch = 1-50 
#### Remarks
The function parameters were changed with patch 1.30 and SoU. This will break any script using this from previous patches using anything but the default value, as a line like this: SetCameraFacing(45.0, CAMERA_TRANSITION_TYPE_CRAWL); no longer makes sense, as three floating point values are required before you can put in the integer value. It is interesting that Bioware didn't ensure backwards compatibility by adding the two new parameters AFTER the already existing ones. 
#### Version
1.28 
#### See Also
functions:  |   StoreCameraFacing   

constants:  |   CAMERA_TRANSITION_TYPE_* Constants   
events:  |   OnAreaTransitionClick Event
