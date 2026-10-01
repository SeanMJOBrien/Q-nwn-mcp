<!-- Source: https://nwnlexicon.com/index.php?title=GetTileHeight&amp;action=history -->

# GetTileHeight(location)

Get the height of the tile at location locTile. 
int GetTileHeight( location locTile);
#### Parameters 

locTile
    The tile location to query the height.
#### Description
Get the height of the tile at location locTile. Returns -1 on error. 
#### Remarks
Not the same as the grounds height - instead this is used with SetTile and similar functions to, say, replace tiles in an area. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  | GetTileID() GetTileOrientation() SetTile() SetTileAnimationLoops() SetTileJson()
