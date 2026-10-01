<!-- Source: https://nwnlexicon.com/index.php/GetObjectVisualTransform -->

# GetObjectVisualTransform(object, int)

Gets a visual transform on the given object. 
float GetObjectVisualTransform( object oObject, int nTransform, int bCurrentLerp = FALSE);
#### Parameters 

oObject
    The object to measure the visual transform from (creature, placeable, item, door) 

nTransform
    An  OBJECT_VISUAL_TRANSFORM_* constant specifying the tranform type to measure 

bCurrentLerp
    Do we want the value from the current instance of the interpolated change to the object (TRUE) or do we want the final set value (FALSE) (default: FALSE)
#### Description
Gets a visual transform on the given object. 
Returns the current (or default) value for the given transformation type. 
#### Remarks
This can be used to retrieve if an object has had any visual transform at all applied, and reset them if they have changed. The defaults are: 
  * 1.0 for animation speed and object scale
  * 0.0 for translate and rotate options

As noted in the parameters you can now get either the final visual state of the object (if bCurrentLerp is FALSE) or the current look of it according to the games interpolation (if bCurrentLerp is TRUE). For instance if you're 5 seconds into a 10 second duration lerp, growing to triple size (3.0 if bCurrentLerp was FALSE), you'd be around twice size instead (2.0 if bCurrentLerp was TRUE) and the lerp type was OBJECT_VISUAL_TRANSFORM_LERP_LINEAR. 
### Known Bugs
The **bCurrentLerp** currently doesn't function and just returns the default values; reported here. 
### Version
This function was added in 1.74.8169 of NWN:EE. 
This function was updated in 1.83.8193.21 of NWN:EE. It added the Interpolation checking parameter. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetObjectVisualTransform()   

constants:  |  OBJECT_VISUAL_TRANSFORM_* Constant Group
