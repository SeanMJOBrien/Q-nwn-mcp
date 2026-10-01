<!-- Source: https://nwnlexicon.com/index.php?title=EndGame&amp;action=history -->

# EndGame(string)
Ends the currently running game. 
void EndGame( string sEndMovie);
#### Parameters 

sEndMovie
    Movie file name (without extension) or "" to show no movie.
#### Description
End the currently running game, play sEndMovie, then returns all players to the game's main menu. 
sEndMovie must be the file name of the movie to play, without the file name extension. These are usually found in the "mov" subdirectory under the NWN installation folder or "movies" folder in the Documents location. However in NWN:EE you can now include wbm files in hakpakcs. 
#### Remarks
This is the _only_ present way to play a movie except having one set at the start of a module (which is how the base game has movies between modules since it uses StartNewModule to move between them). However it also ends the game! 
Changes to this function (see Version below) mean previous remarks about having an "End credits" separate module to skip the credits movie is redundant. If you call it with a blank parameter it properly just exits to the main menu. No longer does your module have the credits of Bioware or anyone else. 
#### Version
This function was updated in 1.84.8193.29 of NWN:EE. 
  * EndGame: We no longer show the Bioware credits for all modules; only the last module in each main campaign.
  * EndGame: Fixed error/crash when calling EndGame(""). Now the game shows no movie instead, and just quits the main menu.

#### Example
// Example 1 - Ends the game using the Ending movie "Ending.wbm".// Yes placing this in a module's OnModuleLoad (found // under "Edit > Module Properties" on the Aurora Toolset)// does indeed cause the movie to play when the module // loadsvoid main(){ EndGame("Ending");}
#### See Also  
---
