<!-- Source: https://nwnlexicon.com/index.php/SetMaterialShaderUniformVec4 -->

# SetMaterialShaderUniformVec4(object, string, string, float, float, float, float)

Sets a vec4 material shader uniform override. 
void SetMaterialShaderUniformVec4( object oObject, string sMaterial, string sParam, float fValue1, float fValue2 = 0.0, float fValue3 = 0.0, float fValue4 = 0.0);
### Parameters 

oObject
    The object to set the shader override upon. 

sMaterial
    Needs to be a material on that object. 

sParam
    Needs to be a valid shader parameter already defined on the material. 

fValue1
    You can specify a single float value to set just a float, instead of a vec4. 

fValue2
    The second float value in a vec4 

fValue3
    The third float value in a vec4 

fValue4
    The fourth float value in a vec4
### Description
Sets a vec4 material shader uniform override. 
### Remarks
While it is vec4, you can use it to set single floats by just using the first value leaving the others at the default 0.0. 
For more information on shaders see the nwn.wiki Shaders page. 
### Version
This function was added in 1.74.8170 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetMaterialShaderUniformVec4(), SetMaterialShaderUniformInt calls not propagating to head/wing/tail/cloak models. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetMaterialShaderUniformInt(), ResetMaterialShaderUniforms()
