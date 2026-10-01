<!-- Source: https://nwnlexicon.com/index.php/DestroyArea -->

# DestroyArea(object)

Destroys the given area object and everything in it. 
int DestroyArea( object oArea);
### Parameters 

oArea
    Area to destroy
### Description
Destroys the given area object and everything in it. 
If the area is in a module, the .are and .git data is left behind and you can spawn from it again. If the area is a temporary copy, the data will be deleted and you cannot spawn it again via the resref. 
Return values: 
  * 0: Object not an area or invalid.
  * -1: Area contains spawn location and removal would leave module without entrypoint.
  * -2: Players in area.
  * 1: Area destroyed successfully.

### Remarks
Simply use this to destroy an area - it can be one that just _exists_ but usually used with CreateArea and CopyArea for dynamic areas. 
This was updated in patch 1.85.8193.30 to maintain save game compatibility; see remarks in the description above. 
When a player reconnects to a server where the area they were in has been destroyed, they are sent to the start location of the module instead. 
### Known Bugs
If the area is destroyed while there are players transitioning into it, the players in question will get their client to be stuck at loading screen indefinitely. It is recommended to add safety measures to avoid this situation. See the example code for a way to do this. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
```
Note that the description of this function was omitted from the PDF release notes. The function is described in a readme in the lang/<language>/docs directory delivered with Neverwinter Nights Enhanced Edition, and in the toolset script editor.

```

This function was updated in 1.80.8193.14 of NWN:EE. See GetTransitionTarget - bug fixed. 
This function was updated in 1.84.8193.29 of NWN:EE. Changes and fixes to how CreateArea and CopyArea are done to have save game compatibility. CopyArea now has sNewTag and sNewName. 
### Example
Areas can be accessed by players in "limbo" ie; loading states - this catches those cases (the function must be repeatedly called until truly no players are in limbo states). 
int VerifyPlayersBeforeDestroyArea(object oArea){ int bPlayerInInvalidArea = FALSE; object oPC = GetFirstPC(); while(GetIsObjectValid(oPC) && bPlayerInInvalidArea == FALSE) { if ((GetArea(oPC))) bPlayerInInvalidArea = TRUE; oPC = GetNextPC(); } // stop and return if any players are in an invalid area, otherwise they might get infinite load/bugs afterwards if(bPlayerInInvalidArea) { SendDebugMessage("cannot reset area "+GetResRef(oArea)+" because player is in invalid area", TRUE); return -4; } else { return DestroyArea(oArea); }}
### See Also
functions:  | CopyArea, CreateArea, SetTransitionTarget
