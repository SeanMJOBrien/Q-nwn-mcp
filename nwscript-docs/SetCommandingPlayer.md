<!-- Source: https://nwnlexicon.com/index.php?title=SetCommandingPlayer&amp;action=history -->

# SetCommandingPlayer(object, object)

Makes oCreature controllable by oPlayer, if player party control is enabled. 
void SetCommandingPlayer( object oCreature, object oPlayer);
#### Parameters 

oCreature
    The creature to make controllable. 

oPlayer
    The player to give control.
#### Description
Makes oCreature controllable by oPlayer, if player party control is enabled. Setting oPlayer=OBJECT_INVALID removes the override and reverts to regular party control behavior 
NB: A creature is only controllable by one player, so if you set oPlayer to a non-Player object (e.g. the module) it will disable regular party control for this creature. 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also  
---
