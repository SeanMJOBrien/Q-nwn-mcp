<!-- Source: https://nwnlexicon.com/index.php?title=GetLastGuiEventPlayer&amp;action=history -->

# GetLastGuiEventPlayer()

Gets the player that last triggered the module OnPlayerGuiEvent event. 
object GetLastGuiEventPlayer();
#### Description
Gets the player that last triggered the module OnPlayerGuiEvent event. 
#### Remarks
The player who called the action. Note the object may not be a proper player object if they are possessing something, such as a familiar. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerGuiEvent for context and an example. 
#### See Also
functions:  |  GetLastGuiEventType GetLastGuiEventInteger GetLastGuiEventObject  

events:  |  OnPlayerGuiEvent
