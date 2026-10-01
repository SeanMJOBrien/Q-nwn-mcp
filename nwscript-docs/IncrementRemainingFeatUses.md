<!-- Source: https://nwnlexicon.com/index.php/IncrementRemainingFeatUses -->

# IncrementRemainingFeatUses(object, int)
Increment the remaining uses per day for this creature by one. 
void IncrementRemainingFeatUses( object oCreature, int nFeat);
### Parameters 

oCreature
    Creature to modify 

nFeat
    Constant  FEAT_* 
### Description
Increment the remaining uses per day for this creature by one. 
Total number of feats per day can not exceed the maximum. 
### Remarks
This can be used in spell-like-feats (eg; Turn Undead) to "replenish" a feat when it is incorrectly/invalidly used by a player. 
To replenish spells see functions like SetMemorizedSpellReady and ReadySpellLevel
### See Also
functions:  |  DecrementRemainingFeatUses  

constants:  |   FEAT_* Constants
