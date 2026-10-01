<!-- Source: https://nwnlexicon.com/index.php/ClearAllActions -->

# ClearAllActions(int)
Clears currently queued actions from the calling object. 
void ClearAllActions( int nClearCombatState = FALSE);
### Parameters 

nClearCombatState
    Stop all current actions, including combat state, if set to TRUE (Default: FALSE)
### Description
Clears all current and queued actions from the calling object. Note that unless nClearCombatState is TRUE, any current fighting state involving the caller of ClearAllActions() will continue until it times out. 
Will do nothing if GetCommandable is FALSE even if actions are queued. 
### Remarks
Commonly used to stop and immediately redirect the current actions of a PC or NPC. 
Only existing Action* functions will be cleared by this call. This includes ActionDoCommand(). It also doesn't clear any DelayCommand() functions or actions. 
Anything that can have actions assigned to it (even just ActionDoCommand()) can have those actions cleared. 
The state change of ClearAllActions is instant, and is itself not an action. 
Due to combat stopping some actions (eg; conversations, resting) you can use the nClearCombatState parameter to allow those actions. Of course doing it while there are enemies still there will cause a creature to get hit as if they were not in combat (various penalties etc.). 
Some other functions in the game such as BeginConversation run an implicit ClearAllActions() as part of calling them. 
### Example
// Example of a PC-triggered earthquake. Place this script in the OnEnter event// of a generic trigger.void main(){ object oPC = GetEnteringObject(); // Stop here if the triggering object is not a PC. if ((oPC)) return; // Cycle through all objects in area and apply the earthquake effect if appropriate. object oArea = GetArea(OBJECT_SELF); object oTarget = GetFirstObjectInArea(oArea); while (GetIsObjectValid(oTarget)) { // We are looking for creatures. Don't apply the effect to doors, placeables, items, etc. if (GetObjectType(oTarget) == OBJECT_TYPE_CREATURE) { // Stop anything the target creature may be doing (TRUE = including combat). AssignCommand(oTarget, ClearAllActions(TRUE)); // Apply the earthquake effects to the target creature. ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_FNF_SCREEN_SHAKE), oTarget); AssignCommand(oTarget, ActionPlayAnimation(ANIMATION_LOOPING_DEAD_BACK, 1.0, 3.0)); } // Get next possible target in area oTarget = GetNextObjectInArea(oArea); }}
### See Also
functions:  | DelayCommand
