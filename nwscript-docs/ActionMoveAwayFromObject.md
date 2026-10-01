<!-- Source: https://nwnlexicon.com/index.php/ActionMoveAwayFromObject -->

# ActionMoveAwayFromObject(object, int, float)
Cause the action subject to move a certain distance away from a target. 
void ActionMoveAwayFromObject( object oFleeFrom, int bRun = FALSE, float fMoveAwayRange = 40.0f);

### Parameters 

oFleeFrom
    The object the action subject will move away from. 

bRun
    If TRUE, the action subject will run rather than walk. (Default: FALSE) 

fMoveAwayRange
    The distance, in meters, to put between the action subject and oFleeFrom. (Default: 40.0f)
### Description
Cause the action subject to move to a certain distance away from oFleeFrom. If oFleeFrom is not in the same area as the action subject, nothing will happen. 
### Version
1.61 
### Example
// This is an example OnPerception event that will make the caller run away from a PC.// Could use this for skittish wildlife, perhaps.void main(){ object oPC = GetLatPerceived(); // If this is a PC or an enemy. if (GetIsPC(oPC) || GetIsEnemy(oPC)) { // Run 50 meters away from the PC ActionMoveAwayFromObject(oPC, TRUE, 50.0); }}
### See Also
functions:  | TalentFlee
