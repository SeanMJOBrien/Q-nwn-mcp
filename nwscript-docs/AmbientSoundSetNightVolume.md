<!-- Source: https://nwnlexicon.com/index.php/AmbientSoundSetNightVolume -->

# AmbientSoundSetNightVolume(object, int)
Change the volume of the nighttime ambient soundtrack in an area. 
void AmbientSoundSetNightVolume( object oArea, int nVolume);

### Parameters 

oArea
    The area to change. 

nVolume
    The percentage (from 0 - 100) at which to set the volume.
### Description
Set the volume of oArea's nighttime ambient soundtrack to nVolume. 
### Remarks
This function changes the volume of ambient _sound_ , not ambient _music_. 
Note that this does not effect any change on the "Sound Effects" slider in a Client's options. This is relative to other server-side sound volumes, and is itself affected by the client's sound volume settings 
### Version
1.22 
### Example
// A trigger's OnEvent script:void main() { // Stop the music. object oArea = GetArea(OBJECT_SELF); MusicBackgroundStop(oArea); // Change the ambient sound settings. AmbientSoundChangeDay (oArea, 46); // al_an_lizrdflk1 AmbientSoundChangeNight (oArea, 46); // al_an_lizrdflk1 AmbientSoundPlay (oArea); // In case it's off AmbientSoundSetDayVolume (oArea, 100); // In case it's too quiet AmbientSoundSetNightVolume(oArea, 100); // In case it's too quiet // Start the music up again. DelayCommand(30.0, MusicBackgroundPlay(oArea));}
### See Also
functions:  | AmbientSoundSetDayVolume, AmbientSoundStop
