<!-- Source: https://nwnlexicon.com/index.php/SetGameActivePause -->

# SetGameActivePause(int)

Sets the active game pause state - same as if the player requested pause. 
void SetGameActivePause( int bState);
#### Parameters 

bState
    The pause state to set.
#### Description
Sets the active game pause state - same as if the player requested pause. 
#### Remarks
The request is done after the current script execution. This means OnCombatRoundEnd which is *just* before a combat round starts (for the AI, a perfect time to add actions like spellcasting in that need to be done immediately) can't be used to have a player auto-pause when a new action can be performed. You might just about be able to time a call of this in a Spell Script however. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetGamePauseState()
