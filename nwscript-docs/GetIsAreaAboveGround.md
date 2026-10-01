<!-- Source: https://nwnlexicon.com/index.php/GetIsAreaAboveGround -->

# GetIsAreaAboveGround

# GetIsAreaAboveGround(object)
Determines whether an area is above ground or not. 
int GetIsAreaAboveGround( object oArea);
#### Parameters
_oArea_
Area to determine whether is above ground 
#### Description
Returns AREA_ABOVEGROUND if the area oArea is above ground, AREA_UNDERGROUND otherwise. Returns AREA_INVALID on an error. 
#### Remarks
The above/under-ground status of the area is set in the area's properties under the advanced tab. AREA_ABOVEGROUND is declared as 1 in nwscript.nss, and AREA_UNDERGROUND as 0. So you could also say that the function returns TRUE if the area is aboveground, and FALSE otherwise. 
#### Version
1.32 
#### See Also
functions:  |   GetIsAreaNatural   

constants:  |   AREA_TRANSITION_* Constants
