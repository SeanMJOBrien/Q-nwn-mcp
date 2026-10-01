<!-- Source: https://nwnlexicon.com/index.php/ActionRest -->

# ActionRest(int)
Causes the creature to rest. 
void ActionRest( int bCreatureToEnemyLineOfSightCheck = FALSE);

### Parameters 

bCreatureToEnemyLineOfSightCheck
    If TRUE, lets the caller rest if enemies are nearby as long as he can't see them. (Default: FALSE)
### Description
The calling creature will enter the rest mode. 
If bCreatureToEnemyLineOfSightCheck is TRUE, it will allow the creature to rest if enemies are nearby, as long as the creature can't see the enemy (e.g., the enemy is in a different room or behind a closed door). If set to FALSE, the creature will not rest if enemies are nearby, regardless of whether or not the he can see them. 
This function is only applicable for creature type objects. 
#### Remarks
ActionRest is added to the front of the action queue, not at the end like other Action* functions. If you want to add it as a normal action, you can call ActionDoCommand(ActionRest());
Note that ActionRest cannot be used in combat (you can check for the combat state using GetIsInCombat()) and automatically fails. It also, as noted above, cancels actions; therefore, it is not wise to assign it during combat. 
This function is useful for a conversation (which cannot be done in combat anyway) which asks if you want to rest in an inn (or suchlike); using AssignCommand, you can make the player rest when you want him to. 
There is no default behavior for resting non-PC creatures (the OnRested default script is empty). If you want anything to happen, you have to code it yourself. Of course, the HP replenishment and spell and feat replenishment is automatic for any creature object - it happens instantly! 
Henchmen (and familiars/animal companions) do not rest as normal. They rest for the same time a PC of their level will, whenever their PC master rests. If, of course, the NPC henchmen is a higher or lower level then the PC, then they take the appropriate time (more or less then the PC). Otherwise, if they rest by themselves, they act like NPC resters - and it happens instantly. 
Any conditions which would stop the use of the rest button will also stop ActionRest(). Usually, it is "You are too close to an enemy creature" or "You cannot rest in combat". It is hard to judge when these conditions (especially the first) is true, so do not try and rely upon this to rest in hostile areas. 
To gain the effects of resting instantly, use ForceRest(). This is especially useful for cutscenes and during battles (if required!) and ignores all conditions of ActionRest() for failure. 
A summary of what happens on rest: 
  * Rest start: 
    * Fires OnPlayerRest with REST_EVENTTYPE_REST_STARTED - at this point it could be cancelled and the rest not do anything (so saves magical effects etc. from being lost)
    * Removal of all magical effects, temporary effects (of any subtype) and temporary magical item properties cast by the rester (on self and others).
    * Poison is applied
    * Animation begins; sit on floor
  * A gradual replacement of spell slots over the duration (doesn't start instantly and goes up in level so level 0 spells are replenished, then 1, etc.)
  * A gradual replacement of HP (eg; starting on 20 of 100 means you gain 80 over the time sitting down)
  * Rest end: 
    * Removal of _all_ effects on the rester except SupernaturalEffect ones applied with DURATION_TYPE_PERMANENT.
    * All dominated creatures are released from the rester
    * Diseases propagate
    * Animation sit on floor is cancelled
    * Event: OnPlayerRest with REST_EVENTTYPE_REST_FINISHED

While no "real time" actually passes the Poison and Disease events evidently imply some time has passed. Using SetTime after a rest is possible but may cause further disease events. 
### Version
1.67 
### Example
// Action's Taken event. Jump the PC to a waypoint named "INN"// Then, make them rest, after 5 seconds.// Waypoint Should be in the same area as inn keeper.void main(){ // Get the PC speaker and waypoint object oPC = GetPCSpeaker(); object oWP = GetWaypointByTag("INN"); // Jump the PC to the waypoint AssignCommand(oPC, JumpToObject(oWP)); // Wait, and do resting. DelayCommand(5.0, AssignCommand(oPC, ActionRest()));}
### See Also
functions:  | GetLastRestEventType
