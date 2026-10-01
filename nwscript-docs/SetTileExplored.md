<!-- Source: https://nwnlexicon.com/index.php?title=SetTileExplored&amp;action=history -->

# SetTileExplored(object, object, int, int, int)

Sets whether the given creature has explored a given tile in an area. 
int SetTileExplored( object creature, object area, int x, int y, int newState);

### Parameters 

creature
    The creature for whom the area is to be explored. Must be a player or player-possessed creature. 

area
    The area in which the tile is to be explored. 

x
    The location of the tile on the x axis. 

y
    The location of the tile on the y axis. 

newState
    Whether the tile should be explored.
### Description
Sets if the given creature has explored tile at x, y of the given area. Note that creature needs to be a player- or player-possessed creature. 
Keep in mind that tile exploration also controls object visibility in areas and the fog of war for interior and underground areas. 
Return values: 
Value  | Description   

-1  | Area or creature invalid   
0  | Tile was not explored before setting newState   
1  | Tile was explored before setting newState   
### Remarks
### Version
This function was added in 1.74.8154 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetTileExplored()
