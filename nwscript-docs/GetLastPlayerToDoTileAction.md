<!-- Source: https://nwnlexicon.com/index.php?title=GetLastPlayerToDoTileAction&amp;action=history -->

# GetLastPlayerToDoTileAction()

Gets the player object that triggered the OnPlayerTileAction event. 
object GetLastPlayerToDoTileAction();
#### Description
Gets the player object that triggered the OnPlayerTileAction event. 
#### Remarks
The player who called the action. Note the object may not be a proper player object if they are possessing something, such as a familiar. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerTileAction for context and an example. 
#### See Also
functions:  |  GetLastTileActionId GetLastTileActionPosition  

events:  |  OnPlayerTileAction
