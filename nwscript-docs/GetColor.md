<!-- Source: https://nwnlexicon.com/index.php/GetColor -->

# GetColor

# GetColor(object, int)
Gets the color assigned to the specified color channel. 
int GetColor( object oObject, int nColorChannel);
#### Parameters
_oObject_
The object from which you are obtaining the color. 
_nColorChannel_
The  COLOR_CHANNEL_*  that you want to get the color value of. 
#### Description
Gets the color assigned to the specified color channel.Returns -1 on error. 
#### Remarks
oObject must be a creature that has been assigned a model that has changeable color channels, such as those used for the playable races. 
nColorChannel can be any of the following channels: COLOR_CHANNEL_SKIN, COLOR_CHANNEL_HAIR, COLOR_CHANNEL_TATTOO_1, COLOR_CHANNEL_TATTOO_2. 
#### Version
1.69 
#### See Also
functions:  |   SetColor   

constants:  |   COLOR_CHANNEL_*   
other:  |   Color Charts
