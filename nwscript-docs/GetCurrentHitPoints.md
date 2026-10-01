<!-- Source: https://nwnlexicon.com/index.php/GetCurrentHitPoints -->

# GetCurrentHitPoints(object)
Determines the number of hit points someone currently has. 
int GetCurrentHitPoints( object oObject = OBJECT_SELF);
#### Parameters 

oObject
    The object whose hitpoints we are to retrieve. (Default: OBJECT_SELF)
#### Description
Returns the number of hitpoints oObject has and 0 if oObject is invalid. 
#### Remarks
This can be called upon any object with hit points - Doors, Placeables and so on therefore have values for this. 
It can also be negative, if dying or dead. 
GetMaxHitPoints can be used to get the objects maximum hitpoints; it ignores temporary effects so may actually be less than the current hitpoints a creature has. 
#### Known Bugs
The maximum hit points of an object is 32,767 as noted in the GFF field for a creature or object (a "short" type). Going over this (eg; by using EffectTemporaryHitpoints will overflow and bug the health of a creature out. It is recommended to use this in combination with a check before applying very large values of EffectTemporaryHitpoints. 
#### Version
1.22 
#### See Also
functions:  |   GetPercentageHPLoss  GetMaxHitPoints
