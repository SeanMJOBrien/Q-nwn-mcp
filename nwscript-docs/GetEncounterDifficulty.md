<!-- Source: https://nwnlexicon.com/index.php/GetEncounterDifficulty -->

# GetEncounterDifficulty(object)
Get the difficulty level of the encounter. 
int GetEncounterDifficulty( object oEncounter = OBJECT_SELF);
#### Parameters 

oEncounter
    An object representing a placed encounter. (Default: OBJECT_SELF)
#### Description
Returns the difficulty level of the given encounter, this is the VALUE column in encdifficulty.2da. 
You cannot get the  ENCOUNTER_DIFFICULTY_* Constants  returned by this. To work around it use a local variable on the object to store this value, or do a reverse lookup using Get2DAString using the encdifficulty.2da. 
#### Remarks
The values returned are the same as the ID column for VERY_EASY, EASY, and NORMAL (0, 1 and 2 respectively) but HARD is 5 and IMPOSSIBLE is 9. Also custom values can be added to encdifficulty.2da. 
#### Version
1.22 
#### See Also
functions:  |  SetEncounterDifficulty  GetEncounterSpawnsMax   

constants:  |   ENCOUNTER_DIFFICULTY_* Constants
