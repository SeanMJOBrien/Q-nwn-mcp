<!-- Source: https://nwnlexicon.com/index.php/GetClassByPosition -->

# GetClassByPosition

# GetClassByPosition(int, object)
Gets the creatures class for the position identified. The position refers to 1st class, 2nd class or third class in a multi class creature. 
int GetClassByPosition( int nClassPosition, object oCreature = OBJECT_SELF);
#### Parameters
_nClassPosition_
1, 2 or 3. 
_oCreature_
The object to check for the class. (Default: OBJECT_SELF) 
#### Description
Returns the CLASS_TYPE_* of the creature for the position nClassPosition. A creature can have up to three classes. This function determines the creature's class (CLASS_TYPE_*) based on nClassPosition. Returns CLASS_TYPE_INVALID if the oCreature does not have a class in nClassPosition (i.e. a single-class creature will only have a value when nClassLocation = 1) or if oCreature is not a valid creature. 
#### Known Bugs
No known bugs as of 1.62. 
#### Version
1.61 
#### See Also
functions:  |   GetLevelByPosition   

constants:  |   CLASS_TYPE_* Constants
