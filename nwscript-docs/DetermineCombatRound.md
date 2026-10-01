<!-- Source: https://nwnlexicon.com/index.php/DetermineCombatRound -->

# DetermineCombatRound

# DetermineCombatRound(object, int)
Determines NPC actions during any given round. 
void DetermineCombatRound( object oIntruder = OBJECT_INVALID, int nAIDifficulty = 10);
#### Parameters
_oIntruder_
(Default: OBJECT_INVALID) 
_nAIDifficulty_
Not Used (Default: 10) 
#### Description
This function is the master function for the generic include and is called from the main script. This function is used in lieu of any actual scripting. This function examines the NPC for spell-casting ability, and other possible actions. 
#### Requirements
#include " NW_I0_GENERIC " 
#### Version
1.28 
#### See Also
functions:  |   DetermineClassToUse   

events:  |   OnPhysicalAttacked Event
