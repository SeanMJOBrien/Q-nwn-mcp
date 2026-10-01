<!-- Source: https://nwnlexicon.com/index.php/SetCommandable -->

# SetCommandable(int, object)
Toggles whether a creature can have actions added to it's queue. 
void SetCommandable( int bCommandable, object oTarget = OBJECT_SELF);
#### Parameters 

bCommandable
    TRUE/FALSE boolean argument. 

oTarget

Creature to set commandable. (Default
    OBJECT_SELF)
#### Description
Set whether oTarget's action queue can be modified. You can test this status with GetCommandable. 
Note that any actions assigned with AssignCommand (including code), of course, will also not work as they try and add actions to the action queue when SetCommandable(FALSE, oTarget) is used, see remarks and the Code. Additionally ClearAllActions won't function on a creature who is not commandable, even if they have actions that could be cleared. 
#### Remarks
This is useful for stopping a creature or PC from doing anything - for instance if you want them to play an animation for a set amount of time without moving. You have to be sure to SetCommandable(TRUE, oTarget); though for them to be later able to move. 
PC's cannot actually add more actions if under the effect of SetCommandable(FALSE, oPC), however, if actions with icons (EG: Casting Magic Missile) are queued and not cancelled, then the PC will still cast them (same for NPC's) but more importantly, can cancel them. 
Therefore, making them do an action, and using SetCommandable to force it, is not sure-fire. If you wish to have a PC have a forced action (such as movement to a location) use SetCutsceneMode - but be careful about not having overlapping cutscene modes turned on due to how it works. 
The state of a PC (Dead/dying) has no effect on weather SetCommandable can be set or not. 
Using SetCommandable with AssignCommand without proper use is a big way to not get results - see the code in the sample box for a detailed explanation. 
You can also try and use ActionDoCommand as per the examples to get an NPC to come out of being uncommandable, however be aware that anything that clears the action queue will also clear that action (eg; ClearAllActions, or possibly some effects if in combat). 
#### Known Bugs
ActionMoveToLocation ignores the commandable state of the creature given the action. Thus, the ActionMoveToLocation action is added to the end of non-commandable creatures' action queues. 
It appears that running SetCommandable(FALSE) on a creature that is dazed, does not work. It is unknown whether other mind-affecting spells can prevent a creature from being set to un-commandable. 
#### Version
1.62 
#### Example
// this first clears oUser's action queue, // then assigns them an animation to play. // then, to insure that they do not just // click to move away and cancel the animation, // we take their ability to modify their // action queue away from them. 4.8 seconds // later, we return command of their action // queue to them again, allowing them to do // what they want or their AI dictates.object oUser = GetLastUsedBy();AssignCommand(oUser,ClearAllActions());AssignCommand(oUser,ActionPlayAnimation(ANIMATION_LOOPING_GET_LOW,1.0,5.0));DelayCommand(0.2,SetCommandable(FALSE,oUser));DelayCommand(4.8,SetCommandable(TRUE,oUser));// Issues with using SetCommandable and AssignCommand - // these are intended behavior, but usually unknown about!// Thanks to Matthew Doulgeris for the examples and notes.// Note 1: Incorrect way to do code:// This is a timing issue. When you AssignCommand stuff it gets// executed AFTER the end of the current script. On the other// hand the SetCommandable(FALSE, oNPC) line is being called// within the script, and therefore is being executed FIRST. So in// other words you are locking their action queue and then trying// to fill it with actions (which will do nothing).void main(){ // EG: A lever object oNPC = GetLastUsedBy(); // These SomeAction's won't actually be added as they are  // actions, and by the time the AssignCommand()'s work, the // creature, oNPC, cannot have new actions assigned. AssignCommand(oNPC, SomeAction1()); AssignCommand(oNPC, SomeAction2()); AssignCommand(oNPC, SomeAction3()); AssignCommand(oNPC, ActionDoCommand(SetCommandable(TRUE))); SetCommandable(FALSE, oNPC);}// Note 2: Correct way:// So basically you need to AssignCommand the // SetCommandable as well, so that it is executed after the // other assigned stuff. ie:void main(){ // EG: A lever object oNPC = GetLastUsedBy(); // In this case, we do everything with AssignCommand() which // means all the things get executed in order which they are // here. AssignCommand(oNPC, SomeAction1()); AssignCommand(oNPC, SomeAction2()); AssignCommand(oNPC, SomeAction3()); AssignCommand(oNPC, ActionDoCommand(SetCommandable(TRUE))); AssignCommand(oNPC, SetCommandable(FALSE));}// Note 3: Alternative and MUCH better way to do this:// Alternately, if you are assigning a lot of stuff it is more// efficient to put it all in a custom function and assign the whole// thing, such as:// Put before main function. It is a normal declared function if you// know about them.void DoActions(){ // Note that OBJECT_SELF is now the assigned object (oNPC) SomeAction(); SomeAction(); SomeAction(); ActionDoCommand(SetCommandable(TRUE)); SetCommandable(FALSE);}// And in the main function...void main(){ // EG: A lever object oNPC = GetLastUsedBy(); // Assign the function to the NPC. This will work fine, really. // As it is one call of AssignCommand(), it is a lot less CPU // intensive, and a lot easier to debug! AssignCommand(oNPC, DoActions());}
#### See Also
functions:  |   GetCommandable
