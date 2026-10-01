<!-- Source: https://nwnlexicon.com/index.php/AssignPCDebugString -->

# AssignPCDebugString

# AssignPCDebugString(string)
Causes the nearest PC speak a string. 
void AssignPCDebugString( string sString);
#### Parameters
_sString_
The debug string to be spoken. 
#### Description
Causes the nearest PC speak a string. 
#### Remarks
// 1.30 source to this function void AssignPCDebugString(string sString) { object oPC = GetNearestCreature(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC); AssignCommand(oPC, SpeakString(sString)); } 
#### Requirements
#include " nw_i0_2q4luskan " 
#### Version
1.30 
#### See Also  
---
