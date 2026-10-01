<!-- Source: https://nwnlexicon.com/index.php/CreateAmmo -->

# CreateAmmo

# CreateAmmo(object, object, int)
Spawns in a ammunition suited for that class as part of the random treasure distribution. 
void CreateAmmo( object oTarget, object oAdventurer, int nModifier = 0);
#### Parameters
_oTarget_
Object to create the item on. 
_oAdventurer_
a Player object 
_nModifier_
Amount of Ammo to create (Default: 0) 
#### Description
Creates a random ammount of ammunition appropriate to the player class. 
#### Remarks
Found in nw_o2_coninclude.nss This can be used to create the item in any object with an inventory. 
#### Requirements
#include " nw_o2_coninclude " 
#### Version
1.61 
#### See Also  
---
