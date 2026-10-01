<!-- Source: https://nwnlexicon.com/index.php/SetColor -->

# SetColor

# SetColor(object, int, int)
Sets the color for the specified color channel. 
void SetColor( object oObject, int nColorChannel, int nColorValue);
#### Parameters
_oObject_
The object affected. 
_nColorChannel_
The  COLOR_CHANNEL_*  that you want to set the color value of. 
_nColorValue_
The color you want to set (0-175). 
#### Description
Sets the color for the given object's specified color channel. 
#### Remarks
oObject must be a creature that has been assigned a model that has changeable color channels, such as those used for the playable races. 
nColorChannel can be any of the following channels: COLOR_CHANNEL_SKIN, COLOR_CHANNEL_HAIR, COLOR_CHANNEL_TATTOO_1, COLOR_CHANNEL_TATTOO_2. 
For help selecting nColorValue, look at this simple  visual guide  of the color choices. 
#### Version
1.69 
#### See Also
functions:  |   GetColor   

constants:  |   COLOR_CHANNEL_*   
other:  |   Color Charts
