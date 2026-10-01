<!-- Source: https://nwnlexicon.com/index.php/GetGameDifficulty -->

# GetGameDifficulty()
Determines the game difficulty setting. 
int GetGameDifficulty();
#### Description
Returns the current game difficulty setting (GAME_DIFFICULTY_*). 
An explanation of NwN difficulty can be found here. 
#### Remarks
Can be used by scripters to scale effect duration, damage and so on. 
Bioware uses it in these main spell functions to implement some of the difficulty described in the game: 
  * GetScaledEffect - for Domination, Charm, Stun, Paralyze, and Fear
  * GetScaledDuration - Used to tune the duration of some of the above effects (although less frequently used)

The main thing with difficulty is that it can be changed moment to moment so must be checked for each script call. 
DMs are the only way to change the difficulty to VERY_EASY where no PCs can actually die at all (they're effectively immortal). 
#### Version
1.22 
#### See Also
constants:  |   GAME_DIFFICULTY_* Constants
