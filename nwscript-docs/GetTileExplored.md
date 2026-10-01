<!-- Source: https://nwnlexicon.com/index.php?title=GetTileExplored&amp;action=history -->

# GetTileExplored(object, object, int, int)

Returns whether the given tile in an area is visible for the given creature. 
int GetTileExplored( object creature, object area, int x, int y);

### Parameters 

creature
    The creature for whom the area is to be checked. Must be a player or player-possessed creature. 

area
    The area in which the tile is located. 

x
    The location of the tile on the x axis. 

y
    The location of the tile on the y axis.
### Description
Returns whether the given tile at x, y, for the given creature in the stated area is visible on the map. Note that creature needs to be a player- or player-possessed creature. 
Keep in mind that tile exploration also controls object visibility in areas and the fog of war for interior and underground areas. 
Return values: 
Value  | Description   

-1  | Area or creature invalid   
0  | Tile is not explored yet   
1  | Tile is explored   
### Remarks
### Version
This function was added in 1.74.8154 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetTileExplored()
