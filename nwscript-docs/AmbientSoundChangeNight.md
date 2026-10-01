<!-- Source: https://nwnlexicon.com/index.php/AmbientSoundChangeNight -->

# AmbientSoundChangeNight(object, int)
Modify an area's nighttime soundtrack. 
void AmbientSoundChangeNight( object oArea, int nTrack);

### Parameters 

oArea
    The area whose soundscape you want to change. 

nTrack
    The 2da reference of the ambient soundtrack to use.
### Description
Changes the ambient nighttime soundtrack for oArea to nTrack, where nTrack is an integer reference to an ambient sound track in ambientsound.2da. nTrack can be a literal integer or an AMBIENT_SOUND_* constant. 
### Remarks
This function changes ambient sound, not ambient music. Ambient sounds are referenced by ambientsound.2da, while ambient music is referenced by ambientmusic.2da and controlled using music effects functions. Also, unlike ambient music files (which appear in the /music directory as *.bmu files), ambient sound files appear in the /ambient directory as .wav files. 
This will also turn the ambient sounds back on if they have been turned off. 
### Version
1.22 
### Example
// A trigger's OnEvent script:void main() { // Stop the music. object oArea = GetArea(OBJECT_SELF); MusicBackgroundStop(oArea); // Change the ambient sound settings. AmbientSoundChangeDay (oArea, 46); // al_an_lizrdflk1 AmbientSoundChangeNight (oArea, 46); // al_an_lizrdflk1 AmbientSoundPlay (oArea); // In case it's off AmbientSoundSetDayVolume (oArea, 100); // In case it's too quiet AmbientSoundSetNightVolume(oArea, 100); // In case it's too quiet // Start the music up again. DelayCommand(30.0, MusicBackgroundPlay(oArea));}
### See Also
functions:  | AmbientSoundChangeDay, AmbientSoundPlay, AmbientSoundStop, SoundObjectPlay
