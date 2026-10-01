<!-- Source: https://nwnlexicon.com/index.php/StartNewModule -->

# StartNewModule(string)
Moves the existing players to a new module. 
void StartNewModule( string sModuleName);
#### Parameters 

sModuleName
    The file name of the module to start.
#### Description
Shut down the currently loaded module and start a new one (moving all currently-connected players to the starting point. 
#### Remarks
This should **not** be used to "restart" a nwserver based multiplayer game. Odd things can happen (hangs, bugs). It is highly recommended to restart it externally using nwserver. 
For singleplayer or co-op campaigns (where an entirely new module is loaded) it is safe to use. When a new module starts the movie will play for all players moving over if one is present (like how the OCs work). 
The StartNewModule command requires the filename of the module to start, not the internal name. There is a handy way to restart modules, used in testing, ie creating a unique power item that restarts the module this way: 
StartNewModule(GetName(GetModule())); 
Note: GetName(GetModule()) returns the internal name, not the filename, so for that approach to work, the filename and the internal name of the module need to exactly the same. 
Also note that if this is used with tag-based scripting, and is called within a On Item Acquired or On Item Activate event, then it might load, load up the reactivate module script via. the On Item Acquired firing (a recent change to the event for HotU), and do the same over and over. Be careful when using it - use it rarely for debugging and starting modules at the end of the current one. 
#### Known Bugs
The bug / issue that caused StartNewModule to crash if called with an invalid filename has been fixed with patch 1.61. If the filename doesn't exist, the function simply fails. 
#### Version
1.64 
#### Example
// Start a new module called "module001", this is the FILENAME, remember main(){ StartNewModule("module001");}// Restart the currently running module - IF the name of the// module is the same as the filename of the module (see above).void main(){ StartNewModule(GetName(GetModule()));}
#### See Also  
---
