<!-- Source: https://nwnlexicon.com/index.php?title=ClearObjectVisualTransform&amp;action=history -->

# ClearObjectVisualTransform(object, int)

Immediately unsets a VTs for the given object, with no lerp. 
void ClearObjectVisualTransform( object oObject, int nScope = -1);
#### Parameters 

oObject
    The object to clear visual transforms from. 

nMask
    The scope of visual transforms to clear.
#### Description
Immediately unsets a VTs for the given object, with no lerp. 
  * nScope: one of OBJECT_VISUAL_TRANSFORM_DATA_SCOPE_, or -1 for all scopes

Returns TRUE only if transforms were successfully removed (valid object, transforms existed). 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  OBJECT_VISUAL_TRANSFORM_DATA_SCOPE_* Constants   

functions:  | GetObjectVisualTransform, SetObjectVisualTransform
