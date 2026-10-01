<!-- Source: https://nwnlexicon.com/index.php/GetNextPC -->

# GetNextPC

# GetNextPC()
Obtains the next PC in the player list. 
object GetNextPC();
#### Description
Returns the next PC in the player list where the last GetFirstPC() or GetNextPC() left off and OBJECT_INVALID if there are no more PCs. 
#### Remarks
You must call GetFirstPC before using this function. 
Note that Dungeon Masters are included in the list of Players checked by this function and GetFirstPC(). 
#### Version
1.22 
#### Example
// This function cycles through all PCs and counts how many there aremain(){ int nPCs = 0; object oPC = GetFirstPC(); while (GetIsObjectValid(oPC) == TRUE) { nPCs = nPCs+1; // nPCs++; oPC = GetNextPC(); }}
#### See Also
functions:  |   GetFirstPC
