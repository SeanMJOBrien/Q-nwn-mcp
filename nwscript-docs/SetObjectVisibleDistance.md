<!-- Source: https://nwnlexicon.com/index.php/SetObjectVisibleDistance -->

# SetObjectVisibleDistance(object, float)

Sets the distance (in meters) at which oObject info will be sent to clients (default 45.0). 
void SetObjectVisibleDistance( object oObject, float fDistance=45.0f);
#### Parameters 

oObject
    The object to set the visibility distance for. 

fDistance
    The viewing distance to set for oObject.
#### Description
Sets the distance (in meters) at which oObject info will be sent to clients (default 45.0). 
This is still subject to other limitations, such as perception ranges for creatures. 
Note: Increasing visibility ranges of many objects can have a severe negative effect on network latency and server performance, and rendering additional objects will impact graphics performance of clients. Use cautiously. 
#### Remarks
Static placeable objects are always visible at any range, so you can set other placeables to act similarly and still have visual transformations - such as making it bigger (for instance a huge tree) - work. 
They won't be optimal but at least they'll be visible since static objects cannot have visual transforms applied. 
Don't use excessively however since clients will get sent more data at once to run/load/process/etc. and if used on creatures PCs may be able to still attack things at further range than expected. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetObjectVisibleDistance()
