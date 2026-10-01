<!-- Source: https://nwnlexicon.com/index.php/ActionMoveAwayFromLocation -->

# ActionMoveAwayFromLocation(location, int, float)
Causes the caller to try to move away from a location 
void ActionMoveAwayFromLocation( location locMoveAwayFrom, int bRun = FALSE, float fMoveAwayRange = 40.0f);

### Parameters 

locMoveAwayFrom
    Location to move away from. 

bRun
    If TRUE, the caller will run rather than walk. (Default: FALSE) 

fMoveAwayRange
    Desired distance, in meters, to move away from locMoveAwayFrom. (Default: 40.0f)
### Description
Causes the action subject to move away from locMoveAwayFrom. 
### Version
1.61 
### Example
// This is an example OnPerception event that will make the caller run away from a PC.// Could use this for skittish wildlife, perhaps.void main(){ object oPC = GetLatPerceived(); // If this is a PC or an enemy. if (GetIsPC(oPC) || GetIsEnemy(oPC)) { // Run 50 meters away from the PC location lLocation = GetLocation(oPC); ActionMoveAwayFromLocation(lLocation, TRUE, 50.0); }}
### See Also
functions:  | ActionMoveToLocation
