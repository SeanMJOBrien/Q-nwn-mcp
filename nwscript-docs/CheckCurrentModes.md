<!-- Source: https://nwnlexicon.com/index.php/CheckCurrentModes -->

# CheckCurrentModes()
Checks to see if we should switch on or off the detect or stealth modes. 
void CheckCurrentModes();

### Description
Checks to see if we should switch on or off the detect or stealth modes. 
### Remarks
This function looks for a nearby waypoint tagged either NW_STEALTH or NW_DETECT. If a NW_STEALTH or NW_DETECT waypoint is found, then the stealth mode or detect mode (respectively) of the caller will be toggled on or off depending on its current setting. 
NOTE: The modes are checked and changed using GetModeActive() and SetModeActive(), which are defined in x0_i0_modes. 
The name of this function is misleading. You can not use it to see the calling object's mode. No value is returned. The function's purpose is to set the caller's NW_MODE_STEALTH and NW_MODE_DETECT flags. If you want to know the caller's mode, use GetModeActive(). 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
includes:  | x0_i0_anims
