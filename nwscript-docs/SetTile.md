<!-- Source: https://nwnlexicon.com/index.php?title=SetTile&amp;action=history -->

# SetTile(location, int, int, int, int)

Change a tile in an area, it will also update the tile for all players in the area. 
void SetTile( location locTile, int nTileID, int nOrientation, int nHeight = 0, int nFlags = SETTILE_FLAG_RECOMPUTE_LIGHTING);
#### Parameters 

locTile
    The tile location. 

nTileID
    The tileID reference into the .set file. 

nOrientation
    The orientation of the tile, 0-3.     0 = Normal orientation     1 = 90 degrees counterclockwise     2 = 180 degrees counterclockwise     3 = 270 degrees counterclockwise 

nHeight
    The height of the tile. 

nFlags
    A bitmask of the SETTILE_FLAG")_* constants.     SETTILE_FLAG_RELOAD_GRASS: reloads the area's grass, use if your tile used to have grass or should have grass now.     SETTILE_FLAG_RELOAD_BORDER: reloads the edge tile border, use if you changed a tile on the edge of the area.     SETTILE_FLAG_RECOMPUTE_LIGHTING: recomputes the area's lighting and static shadows, use most of time.
#### Description
Change a tile in an area, it will also update the tile for all players in the area. 
  * Notes: 
    * For optimal use you should be familiar with how tilesets / .set files work (ie the ID is the ID number in the SET file)
    * Will not update the height of non-creature objects.
    * Creatures may get stuck on non-walkable terrain (make sure to move them to a valid location or only do tiles without creatures on them).

#### Remarks
Perfect for quickly adding a secret door with legitimate changes to the surrounding tiles (so walkmesh works properly). Can also be used to have destructible terrain or similar rather than using VFX for it. 
For more than half a dozen tiles at a time use SetTileJson instead. Using it on areas without PCs/NPCs in isn't as bad. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  | GetTileHeight() GetTileID() GetTileOrientation() SetTileAnimationLoops() SetTileJson()
