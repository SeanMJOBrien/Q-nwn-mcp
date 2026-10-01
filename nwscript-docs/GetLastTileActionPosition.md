<!-- Source: https://nwnlexicon.com/index.php/GetLastTileActionPosition -->

# GetLastTileActionPosition()

Gets the target position in the module OnPlayerTileAction event. 
vector GetLastTileActionPosition();
#### Description
Gets the target position in the module OnPlayerTileAction event. 
#### Remarks
This provides a position, for a full location use Location(GetArea(GetLastPlayerToDoTileAction()), GetLastTileActionPosition(), 0.0). The reason it probably doesn't provide a location is the orientation is non-existent, it's just a point in space. 
This is the main way to gather what you do at a certain point, for instance jumping to a given location needs a destination. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerTileAction for context and an example. 
#### See Also
functions:  |  GetLastTileActionId GetLastPlayerToDoTileAction  

events:  |  OnPlayerTileAction
