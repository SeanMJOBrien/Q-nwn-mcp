<!-- Source: https://nwnlexicon.com/index.php/ReplaceObjectTexture -->

# ReplaceObjectTexture( object, string, string )

Replace individual textures on objects at runtime. 
void ReplaceObjectTexture( object oObject, string sOld, string sNew = "");
### Parameters 

oObject
    An object to update a texture. 

sOld
    The old texture to replace. 

sNew
    The new texture. Specifying sNew = "" will restore the original texture. Maximum 16 characters due to resref sizes. (default: "")
### Description
Replace's oObject's texture sOld with sNew. 
Specifying sNew = "" will restore the original texture. 
If sNew cannot be found, the original texture will be restored. 
sNew must refer to a simple texture, not PLT. 
If the texture has already been replaced, sOld must still match the original texture name for this to work properly. 
### Remarks
This can replace any texture for all clients. It may be done frequently enough to mimic movement (eg; altering a "object tile" texture to show a moving landscape), or to do some useful swaps of terrain (such as snow appearing when it is snowing on top of placeable objects in the area). 
It is per-object so a loop must be done if replacing multiple objects of the same kind. 
It works best with non-material, simple textures. 
Obviously the texture must be appropriate, and using the wrong texture file to replace one can have unforeseen consequences. 
Static placeable objects are not affected by this function at all. 
This function appears to have no effect on an emitter's 'texture' or on an envmap 'reflection' texture applied from placeables.2da 
Since you need to specify an object, GUI textures (such as item icons, or feat icons or similar) cannot be replaced. Use SetTextureOverride for these cases (since they're usually very specific, ie a single feat etc.). 
This function does NOT work from an area's OnEnter event. When the OnEnter event fires, it appears to be too soon for this function to have a valid target. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetTextureOverride()
