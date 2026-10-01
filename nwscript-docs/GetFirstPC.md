<!-- Source: https://nwnlexicon.com/index.php/GetFirstPC -->

# GetFirstPC

# GetFirstPC()
Obtains the first PC 
object GetFirstPC();
#### Description
Returns the first PC in the PC list in order to cycle through all PCs with GetNextPC(). 
#### Remarks
Useful for debugging purposes. If only one person is testing the module you can use SendMessageToPC(GetFirstPC(), "Something Happened") and the first (and only) PC will see that message. 
If you are building for multiplayer, be aware of uses of this function. You could be performing tasks on a player that was not your intended target. 
Note that Dungeon Masters are included in the list of Players checked by this function and GetNextPC(). 
#### Version
1.22 
#### Example
// This function cycles through all PCs and counts how many there arevoid main(){ int nPCs = 0; object oPC = GetFirstPC(); while (GetIsObjectValid(oPC) == TRUE) { nPCs = nPCs+1; // nPCs++; oPC = GetNextPC(); }}
#### See Also
functions:  |   GetNextPC
