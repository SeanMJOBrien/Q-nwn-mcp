<!-- Source: https://nwnlexicon.com/index.php?title=SetTileJson&amp;action=history -->

# SetTileJson(object, json, int, string)

Change multiple tiles in an area, it will also update the tiles for all players in the area. 
void SetTileJson( object oArea, json jTileData, int nFlags = SETTILE_FLAG_RECOMPUTE_LIGHTING, string sTileset = "");
#### Parameters 

oArea
    The tile location. 

jTileData
    a JsonArray() with one or more JsonObject()s with the following keys:     index: the index of the tile as a JsonInt()     For example, a 3x3 area has the following tile indexes:     6 7 8     3 4 5     0 1 2     tileid: the ID of the tile as a JsonInt(), defaults to 0 if not set     orientation: the orientation of the tile as JsonInt(), defaults to 0 if not set     height: the height of the tile as JsonInt(), defaults to 0 if not set     animloop1: the state of a tile animation, 1/0 as JsonInt(), defaults to the current value if not set     animloop2: the state of a tile animation, 1/0 as JsonInt(), defaults to the current value if not set     animloop3: the state of a tile animation, 1/0 as JsonInt(), defaults to the current value if not set 

nFlags
    A bitmask of the SETTILE_FLAG")_* constants.     SETTILE_FLAG_RELOAD_GRASS: reloads the area's grass, use if your tile used to have grass or should have grass now.     SETTILE_FLAG_RELOAD_BORDER: reloads the edge tile border, use if you changed a tile on the edge of the area.     SETTILE_FLAG_RECOMPUTE_LIGHTING: recomputes the area's lighting and static shadows, use most of time. 

sTileset
    If not empty, this can change the area's tileset.     Warning: only use this if you really know what you're doing, it's very easy to break things badly. Make sure jTileData changes *all* tiles in the area and to a tile id that's supported by sTileset.
#### Description
Change multiple tiles in an area, it will also update the tiles for all players in the area. 
Note: See SetTile() for additional information. 
#### Remarks
Note that "orientation" are the values 0-3, not degrees. 0=0°, 1=90°, 2=180°, 3=270°/-90°. This is different than, for example, the .set files that record orientation as degrees. 
The use of this over SetTile is recommended when over half a dozen tiles or so are being changed. But do make sure to experiment. 
Do note that NPCs and PCs may end up in positions they cannot get out of. It might be worth doing places they are not currently present or jumping them to valid positions after tiles under them are changed. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  | GetTileHeight() GetTileID() GetTileOrientation() SetTileAnimationLoops() SetTile()
