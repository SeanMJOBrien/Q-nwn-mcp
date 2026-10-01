<!-- Source: https://nwnlexicon.com/index.php/CheckDCStr -->

# CheckDCStr(int, int, object)
Do a DC check and modify the skill by the target's Strength modifier. 
int CheckDCStr( int DC, int nSkill, object oTarget);

### Parameters 

DC
    Can be set to 0 through 5. 

nSkill
    A SKILL_* constant representing the skill check to make. 

oTarget
    The object that we will be checking the DC for.
### Description
Roll a skill check, modified by oTarget's Strength modifier, with a difficulty of DC. 
Returns TRUE if oTarget passes the skill check. Otherwise, returns FALSE. 
### Requirements
#include "nw_i0_plot" 
### Version
??? 
### Example
// Allow the PC to make a strength check to intimidate an NPC.// // Put this in the Text Appears When... slot of a conversation node spoken by// the NPC after a successful intimidation. If the intimidation was not// successful, this node will not be spoken, and the next node (the "you don't// scare me" one) will fire instead.#include "nw_i0_plot"int StartingConditional(){ int nDC = 15; object oPC = GetPCSpeaker(); return CheckDCStr(nDC, SKILL_INTIMIDATE, oPC);}
### See Also
functions:  | GetAbilityModifier  

constants:  | SKILL_* Constant Group
