<!-- Source: https://nwnlexicon.com/index.php/ApplyPenalty -->

# ApplyPenalty(object)
Applies the penalty for respawn for the resurrecting PC. 
void ApplyPenalty( object oDead);

### Parameters 

oDead
    The PC that is respawning.
### Description
Applies an XP and GP penalty to the player respawning. 
### Remarks
This function is found in the default OnPlayerRespawn script, nw_o0_respawn. This is NOT an include file, so in order to use it outside of that script, you'll also have to copy the function into that other script. The source for the function is listed in the code sample below, and is still current as of version 1.61. 
### Version
1.61 
### Example
// Version 1.24 source for this functionvoid ApplyPenalty(object oDead){ int nXP = GetXP(oDead); int nPenalty = 50 * GetHitDice(oDead); int nHD = GetHitDice(oDead); // * You can not lose a level with this respawning int nMin = ((nHD * (nHD - 1)) / 2) * 1000; int nNewXP = nXP - nPenalty; if (nNewXP < nMin) nNewXP = nMin; SetXP(oDead, nNewXP); int nGoldToTake = FloatToInt(0.10 * GetGold(oDead)); // * a cap of 10 000gp taken from you if (nGoldToTake > 10000) { nGoldToTake = 10000; } AssignCommand(oDead, TakeGoldFromCreature(nGoldToTake, oDead, TRUE)); DelayCommand(4.0, FloatingTextStrRefOnCreature(58299, oDead, FALSE)); DelayCommand(4.8, FloatingTextStrRefOnCreature(58300, oDead, FALSE));}
### See Also  
---
