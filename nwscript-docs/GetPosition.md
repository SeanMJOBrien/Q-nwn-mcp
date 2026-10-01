<!-- Source: https://nwnlexicon.com/index.php/GetPosition -->

# GetPosition

# GetPosition(object)
Determines the position of a creature or object. 
vector GetPosition( object oTarget);
#### Parameters
_oTarget_
#### Description
Returns the position (as a vector) of oTarget. If oTarget is invalid or on other errors this function returns the vector (0.0f, 0.0f, 0.0f). 
#### Version
1.61 
#### Example
//Make the entering PC jump to the corresponding position//in a different areavoid main(){object oPC=GetEnteringObject();if ((oPC)) return;vector vPos=GetPosition(oPC);float fFacing=GetFacing(oPC);//Create a location in another area//"OTHER_AREA" is the tag of that other areaobject oArea=GetObjectByTag("OTHER_AREA");location lNew=Location(oArea, vPos, fFacing);AssignCommand(oPC, JumpToLocation(lNew));}
#### See Also
functions:  |   SetFacingPoint
