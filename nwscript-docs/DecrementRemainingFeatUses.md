<!-- Source: https://nwnlexicon.com/index.php?title=DecrementRemainingFeatUses&amp;action=history -->

# DecrementRemainingFeatUses(object, int)
Decrements the remaining number of uses of a particular feat for a creature. 
void DecrementRemainingFeatUses( object oCreature, int nFeat);
#### Parameters 

oCreature
    Creature to decrement the remaining feat uses of. 

nFeat
     FEAT_* 
#### Description
Decrements the remaining uses per day of a particular feat (FEAT_* constant) for the specified oCreature. 
#### Remarks
You must have at least one feat use remaining to be able to decrement it. It won't do anything if they have run out of uses already. 
Feats which you can use unlimited amounts of time/day, or are not used, cannot be decremented or suppressed. 
Obviously, you must loop until GetHasFeat() is 0 to remove all uses of nFeat on a creature. 
As noted in the fixed issues NPCs may not have every feat in a chain instead just one of them (eg having Barbarian Rage 2, ID 326, but missing FEAT_BARBARIAN_RAGE, ID 293), but it should now correctly work in those cases just like how GetHasFeat checks for them all. 
#### Version
1.69 or earlier: A previous bug with the function actually allowing constant use if the function was used on a creature who had used up their allowance of a feat, then using this set the amount remaining to -1 (constant/unlimited use) has been fixed. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed DecrementRemainingFeatUses() to work correctly on NPCs using feats with successors when they don't have the some of the intermediate feats. 
#### See Also
constants:  |   FEAT_* Constants  IncrementRemainingFeatUses
