<!-- Source: https://nwnlexicon.com/index.php?title=SetShaderUniformVec&amp;action=history -->

# SetShaderUniformVec(object, int, float, float, float, float)

Sets the global shader uniform for the player to the specified vec4. 
void SetShaderUniformVec( object oPlayer, int nShader, float fX, float fY, float fZ, float fW);
### Parameters 

oPlayer
    The player to set the shader override upon. 

nShader
    A SHADER_UNIFORM_* constant. 

fX
    The float X value of a Vec4 to pass into the uniform. 

fY
    The float Y value of a Vec4 to pass into the uniform. 

fZ
    The float Z value of a Vec4 to pass into the uniform. 

fW
    The float W value of a Vec4 to pass into the uniform.
### Description
Sets the global shader uniform for the player to the specified vec4. 
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
functions:  | SetMaterialShaderUniformVec4(), ResetMaterialShaderUniforms(), SetShaderUniformFloat(), SetShaderUniformInt()
