<!-- Source: https://nwnlexicon.com/index.php/AmbientSoundStop -->

# AmbientSoundStop(object)
Stops playing the ambient soundtrack of an area. 
void AmbientSoundStop( object oArea);

### Parameters 

oArea
    The area that should stop playing its ambient soundtrack.
### Description
Stops playing oArea's ambient soundtrack. 
### Remarks
The soundtrack will not cut off abruptly. Instead, it will have a short fade out. 
Contrast this with MusicBackgroundStop(), which stops playing the area's ambient _music_. 
You can change the ambient soundtrack for the area using AmbientSoundChangeDay() and AmbientSoundChangeNight(). 
To start playing the soundtrack again, use AmbientSoundPlay(). 
### Version
1.22 
### Example
// This example script will stop the music from playing. If the ambient sound is// crickets, we could make the crickets fade out when the player gets too close.// A trigger's OnEnter script:void main() { object oArea = GetArea(OBJECT_SELF); AmbientSoundStop(oArea);}
### See Also
functions:  | AmbientSoundChangeDay, AmbientSoundChangeNight, AmbientSoundPlay
