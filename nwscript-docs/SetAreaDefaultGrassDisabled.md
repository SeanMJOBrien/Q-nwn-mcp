<!-- Source: https://nwnlexicon.com/index.php/SetAreaDefaultGrassDisabled -->

# SetAreaDefaultGrassDisabled(object oArea, int bDisabled)

Disables default grass in area oArea when bDisabled is TRUE. 
void SetAreaDefaultGrassDisabled( object oArea, int bDisabled);
#### Parameters 

oArea
    An area. 

bDisabled
    Set to TRUE to disable default grass in the area, set to FALSE to renable it.
#### Description
Disables default grass in area oArea when bDisabled is TRUE. 
#### Remarks
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
The below loops through all areas in a module and disables the default grass in all areas. 
void main(){ // Get the first area in the module, loop while valid. object oArea = GetFirstArea(); while (GetIsObjectValid(oArea)){ // Disable default grass. SetAreaDefaultGrassDisabled(oArea, TRUE); //Get the next area.  oArea = GetNextArea(); }}
#### See Also
functions:  | RemoveAreaGrassOverride")()  | SetAreaGrassOverride()   
---|---|---  
---
