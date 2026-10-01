<!-- Source: https://nwnlexicon.com/index.php/DoPlaceableObjectAction -->

# DoPlaceableObjectAction(object, int)
Starts a placeable object special action. 
void DoPlaceableObjectAction( object oPlaceable, int nPlaceableAction);
#### Parameters 

oPlaceable
    Placeable to do the action on 

nPlaceableAction
    Placeable action to perform -  PLACEABLE_ACTION_* 
#### Description
The caller performs nPlaceableAction on oPlaceable. 
If the action is Use or Unklock, the action is placed at the front of the action queue so you can do this in an OnBlocked event (if it supported placeables) and have the creature bash them - more applicable for DoDoorAction however. To perform it at the end of a queue use ActionDoCommand. 
#### Remarks
You can check if a placeable action may succeed with GetIsPlaceableObjectActionPossible although it is not comprehensive. See that function for details of the checks made. 
For ease of reference the constants do mostly equivalent actions to existing ones (excepting the fact this action is added to the top of the action queue): 
  * PLACEABLE_ACTION_USE - Will ActionInteractObject, it will open the inventory if there is one (firing the OnOpen event), or fire the OnUsed event otherwise.
  * PLACEABLE_ACTION_UNLOCK - Will ActionUseSkill(SKILL_OPEN_LOCK, oPlaceable) then the PLACEABLE_ACTION_USE option of this function to open it - no item is automatically used so ActionUseSkill is still useful here for using thieves tools.
  * PLACEABLE_ACTION_BASH - Will simply ActionAttack(oPlaceable)
  * PLACEABLE_ACTION_KNOCK - Will do ActionCastSpellAtObject(SPELL_KNOCK, oPlaceable) - the SPELL_KNOCK is hardcoded to line 93 of spells.2da, regardless of if it will actually unlock the target.

Use a similar function DoDoorAction for the equivalent version for doors. 
#### Version
1.22 
#### See Also
functions:  |  GetIsPlaceableObjectActionPossible, DoDoorAction, ActionInteractObject, ActionUseSkill, ActionAttack, ActionCastSpellAtObject  

constants:  |   PLACEABLE_ACTION_* Constants
