<!-- Source: https://nwnlexicon.com/index.php/SetEncounterActive -->

# SetEncounterActive(int, object)
Sets an encounter to active or inactive. 
void SetEncounterActive( int nNewValue, object oEncounter = OBJECT_SELF);
#### Parameters 

nNewValue
    TRUE if the encounter is active, otherwise FALSE. 

oEncounter
    The encounter to set active or inactive. (Default: OBJECT_SELF)
#### Description
Set oEncounter's active state to nNewValue. 
When an encounter is exhausted it will set itself to be "not active". 
If your encounter is set for "Continuous" respawns, it will reset itself to "active" each time the Respawn Time lapses. This occurs whether or not you use this function (think of it as a DelayCommand(X.X, SetEncounterActive(TRUE)) call the engine does). 
If you want to use the SetEncounterActive function to control exactly when the encounter is active then you need to use the "Single Shot" setting on the encounter. 
Whenever you call SetEncounterActive(TRUE, oEncounter); it will check for and spawn enemies based on who is in the encounter. This can be used to simulate waves of enemies, or to spawn monsters based on external factors (eg; traps going off, alarms, damaging placeables or doors). 
#### Remarks
From Victor Morales: 
I have tried the SetEncounterActive function to spawn creatures at different times of the day. For example, I only wanted the undead in a cemetery to spawn if it was nighttime. 
If the encounter active flag is set to FALSE to begin with (in the encounter GUI window when the encounter is created) then the SetEncounterActive function will spawn them properly the first time. It seems that the creatures are set to spawn before the OnEnter event is checked for validity. In addition, once the active flag is set it won't revert until the next time the encounter is triggered. 
So I would have undead that would spawn at night properly, but once they spawned - if the time changed to day they would spawn at least one more time during daylight hours. Then the trigger would work properly again. 
I tried to make it reset the active flag to active OnEnter, then the creatures would spawn, and to reset it to inactive OnExit. However, that didn't work either and the behavior stayed the same. 
You can draw a trigger around the encounter and call this function from OnEnter of that trigger instead as a workaround. 
#### Version
1.61 
#### Example
// Purpose: Written for Resurrection Gone Wronger by Kookoo. Used to check for bandit encounters on a dice roll along trade routes.// Location: Goes in the OnEnter of a generic trigger to activate an encounter.// How to Use:// - Place a generic trigger completely around an encounter trigger.// - Make it a single shot encounter and uncheck the "active" box.// - Place a string on the generic trigger with the unique tag of the encounter that you want to fire. Call the// string "ENCOUNTER_TAG". That way you can use this one script for every encounter that you want to make random.// How it Works:// - Will roll the dice to check for a percentage, change the dice size if you want a different percentage.// - Will activate the trigger on a 1.void main(){ object oPC = GetEnteringObject(); if(FALSE == GetIsPC(oPC)) { return; } // Roll the dice int iResult = d4(); // Only return if dice roll is a 1 if(iResult != 1) { return; } object oTrigger = OBJECT_SELF; // Gets the variable off of the trigger that tells what the tag of the encounter is. string sEncounter = GetLocalString(oTrigger, "ENCOUNTER_TAG"); // Sets the encounter active. SetEncounterActive(TRUE, GetNearestObjectByTag(sEncounter));}
#### See Also
functions:  |   GetEncounterSpawnsCurrent
