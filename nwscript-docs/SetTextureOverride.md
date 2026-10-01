<!-- Source: https://nwnlexicon.com/index.php/SetTextureOverride -->

# SetTextureOverride(string, string, object)

Makes oPC load texture sNewName instead of sOldName. 
void SetTextureOverride( string sOldName, string sNewName = "", object oPC = OBJECT_INVALID);
### Parameters 

sOldName
    The texture name specified in game models. 

sNewName
    The replacement texture name. 

oPC
    The player for whom the texture is overridden.
### Description
Makes oPC load texture sNewName instead of sOldName. 
If oPC is OBJECT_INVALID, it will apply the override to all active players. 
Setting sNewName to "" will clear the override and revert to original. 
### Remarks
This changes a texture over an entire module. This is per-PC. It needs further testing on the effectiveness with fancymaps (MTR referenced textures) and PLT files, but works for simple textures. 
Note that any new players (in an MP game) that join need this setting if you want it to be consistent, even if OBJECT_INVALID is used. Presumably if the override already exists an existing PC won't reload it but if you're using a lot of this it's worth testing performance. 
Also note the known bugs below. 
A variety of uses for this come to mind; you can alter textures of the ground tiles to replicate snow falling and piling up. You can alter the texture of a certain unique placeable (which affects the entire module). Per-PC madness effects, or even altering entire tileset appearances can occur. 
You can also replace portraits, icons and textured used by effects. In fact replacing icons can show uses or timers as needed since it can be done per-PC so just affect their icons (eg if you have a cooldown on an ability you could have it fade to an unusable colour even if the feat, technically, can be clicked anytime). 
### Known Bugs
This function is relatively...hacky for what it is. A note from a builder: 
"We found that not unloading texture overrides before a PC leaves an area would frequently result in crashing during the next area's loadscreen. Attempting to unload overrides in an area's OnExit was too late, but wrapping all JumpToLocation/Target calls that exit an area to first unload overrides fixed all crashing. Some nwnx was required for hooking DM goto/jump events too. We also found that attempting to replace water textures frequently resulted in PCs crashing when the overrides are applied." 
So test, test test, especially on a MP server and especially when doing large amounts of texture replacement. 
### Version
This function was added in 1.74.8193.6 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | ReplaceObjectTexture()
