<!-- Source: https://nwnlexicon.com/index.php/SetShaderUniformInt -->

# SetShaderUniformInt(object, int, int)

Sets the global shader uniform for the player to the specified integer. 
void SetShaderUniformInt( object oPlayer, int nShader, int nValue);
### Parameters 

oPlayer
    The player to set the shader override upon. 

nShader
    A SHADER_UNIFORM_* constant. 

nValue
    The integer value to pass into the uniform.
### Description
Sets the global shader uniform for the player to the specified integer. 
These uniforms are not used by the base game and are reserved for module-specific scripting. 
You need to add custom shaders that will make use of them. 
In multiplayer, these need to be reapplied when a player rejoins. 
### Remarks
You are recommended to use bitmasks for on/off settings both to save space and save sending lots of these all the time. 
For some additional notes including about bitmasks see the nwn.wiki. 
### Version
This function was added in 1.87.8193.35 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetMaterialShaderUniformVec4(), ResetMaterialShaderUniforms(), SetShaderUniformFloat(), SetShaderUniformVec()
