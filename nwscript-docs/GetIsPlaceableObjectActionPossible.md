<!-- Source: https://nwnlexicon.com/index.php/GetIsPlaceableObjectActionPossible -->

# GetIsPlaceableObjectActionPossible(object, int)
Check whether a given action is valid for a given placeable object. 
int GetIsPlaceableObjectActionPossible( object oPlaceable, int nPlaceableAction);
#### Parameters 

oPlaceable
    Placeable object. 

nPlaceableAction
     PLACEABLE_ACTION_* 
#### Description
Returns TRUE if the owner of the script can perform the action specified in the second argument on the placeable object given in the first argument. Otherwise, returns FALSE. 
Use it before DoPlaceableObjectAction to confirm such an action is valid. 
The details of each check are: 
  * PLACEABLE_ACTION_USE - The placeable is closed, and is not locked
  * PLACEABLE_ACTION_UNLOCK - The placeable is locked, does not require a key, and the creatures SKILL_OPEN_LOCK is >= the placeable lock DC with a take 20.
  * PLACEABLE_ACTION_BASH - The placeable is not plot
  * PLACEABLE_ACTION_KNOCK - The placeable is not plot, does not require a key, and the creature has GetHasSpell(SPELL_KNOCK), line 93 of spells.2da

#### Remarks
This function only works if it is placed in a script which is "owned" by the creature which will be performing the action. Otherwise, it will always return FALSE. This is necessary because it takes the abilities of the creature into account when determining whether the action is possible. 
#### Version
1.22 
#### See Also
constants:  |   PLACEABLE_ACTION_* Constants  DoPlaceableObjectAction
