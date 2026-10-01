<!-- Source: https://nwnlexicon.com/index.php/AutoDC -->

# AutoDC(int, int, object)
Determines whether a skill check succeeds. 
int AutoDC( int nDC, int nSkill, object oTarget);

### Parameters 

nDC
    A DC_* constant reflecting the approximate difficulty of the roll. 

nSkill
    A SKILL_* constant representing the skill check the target is rolling. 

oTarget
    The creature rolling to determine success.
### Description
Returns TRUE if oTarget succeeds a check based on nSkill for a crude difficulty category nDC. 
### Remarks
As of patch 1.30, this function will work on non-creatures as well. It uses the hitdice of the caller in a division, but if that hitdice is 0 (as for non-creature), it just divides by 1 instead. 
NOTE: The version of this function located in here is MUCH better than the version located in nw_i0_tool. This version can test for DCs superior through epic. It also has tests for charmed and dominated effects. 
### Known Bugs
Previously noted bug was fixed in version 1.59 / patch 1.60. 
### Requirements
#include "nw_i0_plot" 
### Version
1.61 
### See Also
functions:  |  GetIsSkillSuccessful   

constants:  | SKILL_* Constants
