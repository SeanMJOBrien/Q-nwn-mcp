<!-- Source: https://nwnlexicon.com/index.php/SetUseableFlag -->

# SetUseableFlag

# SetUseableFlag(object, int)
Set a placeable's usable object status. 
void SetUseableFlag( object oPlaceable, int nUseableFlag);
#### Parameters
_oPlaceable_
The placeable object to change the usable status of. 
_nUseableFlag_
Presumably this is a TRUE (usable) / FALSE (not usable) setting. 
#### Description
Set a placeable's usable object status. 
#### Remarks
Note: Only works on non-static placeables. You can use this to hide a usable placeable among static ones. 
Note however that static placeables can still be interacted with by scripts in a variety of ways, even if they can't be turned into usable placeables on the fly. 
#### Version
1.68 
#### See Also
functions:  |   GetUseableFlag
