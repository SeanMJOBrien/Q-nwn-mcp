<!-- Source: https://nwnlexicon.com/index.php/AngleToVector -->

# AngleToVector(float)
Converts an angle into a vector. 
vector AngleToVector( float fAngle);

### Parameters 

fAngle
    The degrees of an angle to convert into a vector.
### Description
Returns the unit vector of fAngle in relation to area orientation. 
### Version
1.30 
### Example
// Stalker script (but in an NPC's OnHeartbeat script)// Supplied by Cheironvoid main(){ object oTarget = GetNearestCreature(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC); object oArea = GetArea (oTarget); vector vPosition = GetPosition(oTarget); float fOrientation = GetFacing (oTarget); // This is where AngleToVector shows its powers! vector vNewPos = AngleToVector(fOrientation); float vX = vPosition.x - vNewPos.x; float vY = vPosition.y - vNewPos.y; float vZ = vPosition.z; vNewPos = Vector(vX, vY, vZ); ClearAllActions(); // Go stand right behind the PC (if he's still there) ActionMoveToLocation(Location(oArea, vNewPos, fOrientation)); // Turn towards PC ActionDoCommand(SetFacing(fOrientation));}
### See Also
functions:  | VectorToAngle
