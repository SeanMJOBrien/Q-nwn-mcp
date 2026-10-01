<!-- Source: https://nwnlexicon.com/index.php/SetFacingPoint -->

# SetFacingPoint

# SetFacingPoint(vector)
Sets the object to face the direction of a vector. 
void SetFacingPoint( vector vTarget);
#### Parameters
_vTarget_
The vector to have the object face. 
#### Description
Cause the caller to face vTarget. Functions GetPosition and GetPositionFromLocation will provide vectors that can be used as parameters to this function. 
#### Version
1.61 
#### Example
//Make the caller face oTargetvoid SetFacingObject(object oTarget){vector vFace=GetPosition(oTarget);SetFacingPoint(vFace);}void main(){//Example of use: Caller faces the nearest PC:object oPC=GetNearestCreature(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC);if (GetIsObjectValid(oPC)) SetFacingObject(oPC);}
#### See Also
functions:  |   SetFacing
