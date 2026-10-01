<!-- Source: https://nwnlexicon.com/index.php/CreateArcaneScroll -->

# CreateArcaneScroll

# CreateArcaneScroll(object, object, int)
Creates a scroll as part of the treasure 
void CreateArcaneScroll( object oTarget, object oAdventurer, int nModifier = 0);
#### Parameters
_oTarget_
Object to create item on. 
_oAdventurer_
A Player object 
_nModifier_
Modify oAdventurer's level for use in this function. (Default: 0) 
#### Description
This function creates a scroll appropriate to the level and type of caster opening the chest as part of the treasure generation routines. 
#### Remarks
nModifier is to 'raise' the level of the oAdventurer. Function is found in; nw_o2_coninclude.nss This can be used to create the item in any object with an inventory. 
#### Requirements
#include " nw_o2_coninclude " 
#### Version
1.61 
#### See Also  
---
