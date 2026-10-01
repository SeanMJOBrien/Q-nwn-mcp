<!-- Source: https://nwnlexicon.com/index.php/SetCreatureExploresMinimap -->

# SetCreatureExploresMinimap(object, int)

Sets whether the creature will auto-explore the minimap as it walks around. 
int SetCreatureExploresMinimap( object creature, int newState);
### Parameters 

creature
    The creature to set the exploration state. 

newState
    whether auto-exploration is on (TRUE) or off (FALSE).
### Description
Sets the creature to auto-explore the map as it walks around. 
Keep in mind that tile exploration also controls object visibility in areas and the fog of war for interior and underground areas. 
This means that if you turn off auto exploration, it falls to you to manage this through SetTileExplored(); otherwise, the player will not be able to see anything. 
Does nothing for non-creatures. 
Returns the previous state (or -1 if non-creature). 
### Remarks
### Version
This function was added in 1.74.8154 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetCreatureExploresMinimap()
