<!-- Source: https://nwnlexicon.com/index.php/Vibrate -->

# Vibrate(object, int, float, float)

Vibrate the player's device or controller. Does nothing if vibration is not supported. 
void Vibrate( object oPlayer, int nMotor, float fStrength, float fSeconds);
### Parameters 

oPlayer
    A Player object to target with the vibrate command. 

nMotor
    A VIBRATOR_MOTOR_* constant specifying the motor to vibrate. 

fStrength
    The strength of the vibrate command. See below for details. 

fSeconds
    The duration of the Vibrate command, measured in seconds.
### Description
Vibrate the player's device or controller. Does nothing if vibration is not supported. 
  * nMotor is one of VIBRATOR_MOTOR_* constant
  * fStrength is between 0.0 and 1.0
  * fSeconds is the number of seconds to vibrate

### Remarks
This only works on consoles. It is not supported on Android, iOS or desktop versions presently. 
### Version
1.74.8188 Note that the description of this function was omitted from the release notes. The function is described in nwscript. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
constants:  |   VIBRATOR_MOTOR_* Constants
