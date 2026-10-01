<!-- Source: https://nwnlexicon.com/index.php/FadeToBlack -->

# FadeToBlack(object, float)
Fades the screen for a given player to black. 
void FadeToBlack( object oCreature, FADE_SPEED_MEDIUM);
### Parameters 

oCreature
    Creature controlled by a player to fade the screen of. 

fSpeed
    Speed at which to fade into black (FADE_SPEED_*). (Default:  FADE_SPEED_MEDIUM )
### Description
Fades the screen for a given player or creature from a regular screen to black. 
### Remarks
Great for use when starting a cutscene. Or to give the impression of some time passing by. 
While fSpeed looks like the amount of seconds of the fade the engine actually converts the set values to final second amounts clientside. 
### Version
1.30 
### Example
// Example of a simple cutscene by Lilac Soul// If you have a script in OnCutsceneAbort, you can simply// ClearAllActions on the PC to make the scene stop,// then remove the invisibility visual effect and// SetCutsceneMode to false, and destroy the copy.void RemoveTaggedEffects(object oObject, string sTag);void RunCutsceneActions();void CreateCopy(object oPC = OBJECT_SELF);void main(){ object oPC=GetEnteringObject(); if ((oPC)) return; AssignCommand(oPC, RunCutsceneActions());}// Remove all effects of sTag on oObjectvoid RemoveTaggedEffects(object oObject, string sTag){ effect eCheck = GetFirstEffect(oObject); while(GetIsEffectValid(eCheck)) { if(GetEffectTag(eCheck) == sTag) RemoveEffect(oObject, eCheck); eCheck = GetNextEffect(oObject); }}// Wrapped in its own function so that oPC can be// OBJECT_SELF so there's no need for AssignCommand// Making heavy use of ActionDoCommand to be able to control// that one thing must finish before another startsvoid RunCutsceneActions(){ // Fade out the PC ActionDoCommand(FadeToBlack(OBJECT_SELF, FADE_SPEED_FAST)); ActionWait(2.0); ActionDoCommand(SetCutsceneMode(OBJECT_SELF, TRUE)); // Create a copy so we can move the invisible PC around // and still have him think he's standing where he was ActionDoCommand(CreateCopy()); // Make PC invisible effect eInv=TagEffect(EffectVisualEffect(VFX_DUR_CUTSCENE_INVISIBILITY), "CUTSCENE"); ActionDoCommand(ApplyEffectToObject(DURATION_TYPE_PERMANENT, eInv, OBJECT_SELF)); // Fade PC back in ActionDoCommand(FadeFromBlack(OBJECT_SELF, FADE_SPEED_FAST)); // Here then, move the invisible PC around and do whatever // It will look like the camera is just moving, and the // player will have the impression of standing still because // we created a copy of him // If having others do stuff, like oNPC, you can do this trick // To have the NPC action added to the PC's action queue // REMEMBER: NO MORE THAN 75 ACTIONS IN AN ACTION QUEUE! // ActionDoCommand(AssignCommand(oNPC, ActionSpeakString("Hello"))); // Eventually, we call ActionDoCommand(FadeToBlack(OBJECT_SELF, FADE_SPEED_FAST)); ActionWait(2.0); ActionDoCommand(SetCutsceneMode(OBJECT_SELF, FALSE)); // Destroy the copy ActionDoCommand(DestroyObject(GetLocalObject(GetModule(), "pccopy"))); ActionDoCommand(RemoveTaggedEffects(OBJECT_SELF, "CUTSCENE")); ActionDoCommand(FadeFromBlack(OBJECT_SELF, FADE_SPEED_FAST));}// Function for creating a copy of the PCvoid CreateCopy(object oPC = OBJECT_SELF){ object oCopy=CopyObject(oPC, GetLocation(oPC)); // Make sure the copy likes the PC SetIsTemporaryFriend(oPC, oCopy); // Store so we can destroy later! SetLocalObject(GetModule(), "pccopy", oCopy);}
### See Also
functions:  | StopFade  

constants:  | FADE_SPEED_* Constants  
events:  | OnCutsceneAbort Event
