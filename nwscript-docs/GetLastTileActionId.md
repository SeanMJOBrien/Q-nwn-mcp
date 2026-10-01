<!-- Source: https://nwnlexicon.com/index.php?title=GetLastTileActionId&amp;action=history -->

# GetLastTileActionId()

Gets the ID (1..8) of the last tile action performed in OnPlayerTileAction. 
effect GetLastTileActionId();
#### Description
Gets the ID (1..8) of the last tile action performed in OnPlayerTileAction. 
#### Remarks
The action ID relates to the columns in surfacemat.2da. The column names are identified by ActX_Strref and ActX_Icon where X is 1 to 8. 
Therefore if you have "Jump" as action 1 for "Grass" surface material, which you can retrieve using GetSurfaceMaterial, you then perform your "Jump" action in the script. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerTileAction for context and an example. 
#### See Also
functions:  |  GetLastTileActionPosition GetLastPlayerToDoTileAction  

events:  |  OnPlayerTileAction
