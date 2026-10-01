<!-- Source: https://nwnlexicon.com/index.php/DoDoorAction -->

# DoDoorAction(object, int)
Does specific action to target door. 
void DoDoorAction( object oTargetDoor, int nDoorAction);
#### Parameters 

oTargetDoor
    Door action is to occur to. 

nDoorAction
    Door action to perform -  DOOR_ACTION_* 
#### Description
Perform nDoorAction on oTargetDoor. 
#### Remarks
This is specifically for adding the action on top of an action queue. This means the OnBlocked event can fire and open a door without disrupting any ActionMoveToLocation commands. 
Not all GetIsDoorActionPossible checks are comprehensive, therefore DoDoorAction may fail even if the check is passed. 
The actions usually have equivalent action calls, useful for thieves tools: 
  * DOOR_ACTION_OPEN - ActionOpenDoor is equivalent, although this command will put that at the top of the action queue.
  * DOOR_ACTION_UNLOCK - Will ActionUseSkill(SKILL_OPEN_LOCK, oTargetDoor) then the DOOR_ACTION_OPEN option of this function to open it - no item is automatically used so ActionUseSkill is still useful here for using thieves tools.
  * DOOR_ACTION_BASH - Will simply ActionAttack(oTargetDoor)
  * DOOR_ACTION_IGNORE - Presumably if done on a door will make that door ignored (can we ignore more than one door?) and so pathfinding should then find an alternative route if say ActionMoveToLocation is attempted again. You could ignore plot locked doors or similar. Bioware never uses this in the default game AI scripts so needs further testing.
  * DOOR_ACTION_KNOCK - Will do ActionCastSpellAtObject(SPELL_KNOCK, oTargetDoor) - the SPELL_KNOCK is hardcoded to line 93 of spells.2da, regardless of if it will actually unlock the target.

#### Version
1.22 
#### See Also
functions:  |  GetIsDoorActionPossible GetIsPlaceableObjectActionPossible  

constants:  |   DOOR_ACTION_* Constants  
events:  |  OnBlocked
