<!-- Source: https://nwnlexicon.com/index.php/GetIsAreaNatural -->

# GetIsAreaNatural

# GetIsAreaNatural(object)
Returns whether an area is natural or not 
int GetIsAreaNatural( object oArea);
#### Parameters
_oArea_
Area to test whether is natural 
#### Description
Returns AREA_NATURAL if the area oArea is natural, AREA_ARTIFICIAL otherwise. Returns AREA_INVALID, on an error. 
Appears to return -1 if the object oArea is not actually an area but a different type of object. 
#### Remarks
The natural / artificial status of the area is set in the area's properties under the advanced tab. AREA_NATURAL is declared as 1 in nwscript.nss, and AREA_ARTIFICIAL as 0. So you could also say that the function returns TRUE if the area is natural, and FALSE otherwise. 
#### Version
1.32 
#### See Also
functions:  |   GetIsAreaInterior   

constants:  |   AREA_TRANSITION_* Constants
