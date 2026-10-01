<!-- Source: https://nwnlexicon.com/index.php?title=SetMaterialShaderUniformInt&amp;action=history -->

# SetMaterialShaderUniformInt(object, string, string, int)

Sets an integer material shader uniform override. 
void SetMaterialShaderUniformInt( object oObject, string sMaterial, string sParam, int nValue);

### Parameters 

oObject
    The object to set the shader override upon. 

sMaterial
    Needs to be a material on that object. 

sParam
    Needs to be a valid shader parameter already defined on the material. 

nValue
    The integer value to set.
### Description
Sets an integer material shader uniform override. 
### Remarks
For more information on shaders see the nwn.wiki Shaders page. 
### Version
This function was added in 1.74.8170 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetMaterialShaderUniformVec4(), SetMaterialShaderUniformInt calls not propagating to head/wing/tail/cloak models. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetMaterialShaderUniformVec4(), ResetMaterialShaderUniforms()
