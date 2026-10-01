<!-- Source: https://nwnlexicon.com/index.php/GetIsDoorActionPossible -->

# GetIsDoorActionPossible(object, int)
Determines whether an action can be used on a door. 
int GetIsDoorActionPossible( object oTargetDoor, int nDoorAction);
#### Parameters 

oTargetDoor
    The door to be checked. 

nDoorAction
    Door action to check -  DOOR_ACTION_* 
#### Description
Returns TRUE if nDoorAction can be performed on oTargetDoor, otherwise FALSE. Use this in a creatures OnBlocked event. 
#### Remarks
This is used by Bioware AI scripts for henchmen to attempt different actions on a door if their masters (PCs) fail to open a door. For example, if the henchmen can cast the spell Knock, the script first checks if GetIsDoorActionPossible(oDoor, DOOR_ACTION_KNOCK) before casting Knock. 
DoDoorAction can be used to not disrupt an action queue, normally in a creatures OnBlocked event. Of course, this function will return FALSE if oTargetDoor is not a door. 
The checks done for each parameter are: 
  * DOOR_ACTION_OPEN - The door is closed, and is not locked - or if it is locked, we have the key
  * DOOR_ACTION_UNLOCK - The door is locked, does not require a key, and the creatures SKILL_OPEN_LOCK is >= the door lock DC with a take 20.
  * DOOR_ACTION_BASH - The door is not plot
  * DOOR_ACTION_IGNORE - Nothing special is checked (excepting the default that the door is valid)
  * DOOR_ACTION_KNOCK - The door is not plot, does not require a key, and the creature has GetHasSpell(SPELL_KNOCK), line 93 of spells.2da

It will not check; 
  * That we are commandable (eg; not stunned or knocked down)
  * That the door object can be pathed to properly
  * That our weapon can bash the given doors hardiness

#### Known Bugs
The DOOR_ACTION_KNOCK parameter is limited to knowing the spell, and will not check what the spell file NW_S0_Knock checks (eg; the difficulty, local variables, or anything else). 
#### Version
1.22 
#### See Also
functions:  |  DoDoorAction GetIsPlaceableObjectActionPossible  

constants:  |   DOOR_ACTION_* Constants  
events:  |  OnBlocked
