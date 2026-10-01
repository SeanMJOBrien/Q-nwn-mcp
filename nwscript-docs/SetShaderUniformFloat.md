<!-- Source: https://nwnlexicon.com/index.php/SetShaderUniformFloat -->

# SetShaderUniformFloat(object, int, float)

Sets the global shader uniform for the player to the specified float. 
void SetShaderUniformFloat( object oPlayer, int nShader, float fValue);
### Parameters 

oPlayer
    The player to set the shader override upon. 

nShader
    A SHADER_UNIFORM_* constant. 

fValue
    The float value to pass into the uniform.
### Description
Sets the global shader uniform for the player to the specified float. 
These uniforms are not used by the base game and are reserved for module-specific scripting. 
You need to add custom shaders that will make use of them. 
In multiplayer, these need to be reapplied when a player rejoins. 
### Remarks
For some additional notes see the nwn.wiki. 
### Version
This function was added in 1.87.8193.35 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetMaterialShaderUniformVec4(), ResetMaterialShaderUniforms(), SetShaderUniformInt(), SetShaderUniformVec()
