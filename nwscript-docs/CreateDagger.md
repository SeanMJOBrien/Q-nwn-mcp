<!-- Source: https://nwnlexicon.com/index.php/CreateDagger -->

# CreateDagger

# CreateDagger(object, object)
Used to create a magical dagger in a container as part of the treasure distribution model 
void CreateDagger( object oTarget, object oAdventurer);
#### Parameters
_oTarget_
Object to create the item in 
_oAdventurer_
a Player object 
#### Description
Spawns in a magical weapon suited for that class as part of the random treasure distribution. 
#### Remarks
Found in nw_o2_feat.nss This can be used to create the item in any object with an inventory. 
#### Requirements
#include " nw_o2_feat " 
#### Version
1.61 
#### See Also
functions:  |   CreateItemOnObject
