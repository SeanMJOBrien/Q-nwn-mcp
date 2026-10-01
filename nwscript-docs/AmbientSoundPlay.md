<!-- Source: https://nwnlexicon.com/index.php/AmbientSoundPlay -->

# AmbientSoundPlay(object)
Starts playing the ambient soundtrack of an area. 
void AmbientSoundPlay( object oArea);

### Parameters 

oArea
    The area that should start playing its ambient soundtrack.
### Description
Starts playing oArea's ambient soundtrack. 
### Remarks
Contrast this with MusicBackgroundPlay(), which starts playing the area's ambient _music_. 
You can change the ambient soundtrack for the area using AmbientSoundChangeDay() and AmbientSoundChangeNight(). 
To stop the soundtrack from playing, use AmbientSoundStop(). 
### Version
1.22 
### Example
// A trigger's OnEvent script:void main() { // Stop the music. object oArea = GetArea(OBJECT_SELF); MusicBackgroundStop(oArea); // Change the ambient sound settings. AmbientSoundChangeDay (oArea, 46); // al_an_lizrdflk1 AmbientSoundChangeNight (oArea, 46); // al_an_lizrdflk1 AmbientSoundPlay (oArea); // In case it's off AmbientSoundSetDayVolume (oArea, 100); // In case it's too quiet AmbientSoundSetNightVolume(oArea, 100); // In case it's too quiet // Start the music up again. DelayCommand(30.0, MusicBackgroundPlay(oArea));}
### See Also
functions:  | AmbientSoundChangeDay, AmbientSoundChangeNight, AmbientSoundStop
