<!-- Source: https://nwnlexicon.com/index.php/GetCurrentAction -->

# GetCurrentAction(object)
Returns the currently executing Action. 
int GetCurrentAction( object oObject = OBJECT_SELF);
#### Parameters 

oObject
    The object to return the Action of. (Default: OBJECT_SELF)
#### Description
Get the current action (ACTION_*) that oObject is executing from its Action Queue. See the ACTION_* constant page for what actions these are. 
oObject can be anything with an action queue. Modules and Areas cannot have actions assigned to them. Reutrns ACTION_INVALID on error or if the current action is not on a whitelist of ones that can be returned. 
Some of the actions not included which will return ACTION_INVALID (65535) are: 
  * Player WASD/QE drive movement
  * Disappear/Appear as part of EffectDisappear, EffectDisappearAppear etc.
  * ActionSpeakString
  * ActionDoCommand
  * ActionPlayAnimation or PlayAnimation
  * SetFacing
  * ActionEquipItem or ActionUnequipItem (Although these are nearly instant)
  * Other "not true" or instant actions like ActionExamine, ActionJumpToObject, etc.

There are several actions in actions.2da which are not defined as constants (and won't be returned by this function) and are essentially variants of ACTION_ATTACK (eg: Knockdown), apart from the Barter action (PC to PC item trading) which is also not a "true" action. 
Two constants which are defined also won't be returned; ACTION_SMITEGOOD and ACTION_KI_DAMAGE, since the actions for Knockdown and the like are not made into constants it is odd these were when they don't function. ACTION_DIALOGOBJECT is also suspect and is likely not going to be returned - you can be in a conversation and also do other actions, although the act of trying to trigger dialogue may return it (ActionStartConversation). 
Some of the actions that are referenced in actions.2da are instead found by GetActionMode, so you will never get these return values usually (Defensive Stance (42), Dirty Fighting (39)). 
#### Remarks
As of 1.60 ACTION_RANDOM_WALK can be returned. 
This is primarily useful for NPCs checking what they are up to for the purposes of AI, such as ambient animations ("Am I walking around?") or in combat. You can also check what the player is doing but since they have a much heavier control over what they are up to relying on the return value at a single point in time may not be accurate (eg; for checking if they are casting spells, checking only once every 6 seconds won't be sufficient). 
Be aware that since several actions will not return an ACTION_* constant you can't assume the creature is doing nothing if ACTION_INVALID is returned. The primary one it will fail with is WASD/QE player movement, which is very common on players. 
#### Version
1.22 
#### Example
// Example of how to get the label of the current action for debugging purposes.// Note: not all actions have defined string TLK entries (eg: "Follow")string GetActionLabel(int nAction){ return Get2DAString("actions", "Label", nAction);}
// On Phsical Attacked event, if we are currently moving, stop.// Could use to stop a moving archery target in an archery range.void main(){ if(GetUserDefinedEventNumber() == 1005) { // Check action - ACTION_MOVETOPOINT if(GetCurrentAction() == ACTION_MOVETOPOINT) { // Stop moving ClearAllActions(); // Could do other stuff } }}
#### See Also
constants:  |   ACTION_* Constants
