<!-- Source: https://nwnlexicon.com/index.php/FadeFromBlack -->

# FadeFromBlack

# FadeFromBlack(object, float)
Fades the screen from black into normal view. 
void FadeFromBlack( object oCreature, FADE_SPEED_MEDIUM);
#### Parameters
_oCreature_
Creature to fade the screen of from black to normal. 
_fSpeed_
Determines how fast the fade occurs (FADE_SPEED_*). (Default:  FADE_SPEED_MEDIUM ) 
#### Description
Fades the screen for a given creature or player from black to regular screen. 
#### Remarks
Great for use in cutscenes or when giving the impression of time passing by. Should only be called after the screen has faded to black. 
#### Version
1.30 
#### Example
//Example of a simple cutscene by Lilac Soul//If you have a script in OnCutsceneAbort, you can simply//ClearAllActions on the PC to make the scene stop,//then remove the invisibility visual effect and//SetCutsceneMode to false, and destroy the copy.void RunCutsceneActions();void CreateCopy(object oPC = OBJECT_SELF);void main(){object oPC=GetEnteringObject();if ((oPC)) return;AssignCommand(oPC, RunCutsceneActions());}//Wrapped in its own function so that oPC can be//OBJECT_SELF so there's no need for AssignCommand//Making heavy use of ActionDoCommand to be able to control//that one thing must finish before another startsvoid RunCutsceneActions(){//Fade out the PCActionDoCommand(FadeToBlack(OBJECT_SELF, FADE_SPEED_FAST));ActionWait(2.0);ActionDoCommand(SetCutsceneMode(OBJECT_SELF, TRUE));//Create a copy so we can move the invisible PC around//and still have him think he's standing where he wasActionDoCommand(CreateCopy());//Make PC invisibleeffect eInv=EffectVisualEffect(VFX_DUR_CUTSCENE_INVISIBILITY);ActionDoCommand(ApplyEffectToObject(DURATION_TYPE_PERMANENT, eInv, OBJECT_SELF));//Fade PC back inActionDoCommand(FadeFromBlack(OBJECT_SELF, FADE_SPEED_FAST));//Here then, move the invisible PC around and do whatever//It will look like the camera is just moving, and the//player will have the impression of standing still because//we created a copy of him//If having others do stuff, like oNPC, you can do this trick//To have the NPC action added to the PC's action queue//REMEMBER: NO MORE THAN 75 ACTIONS IN AN ACTION QUEUE!//ActionDoCommand(AssignCommand(oNPC, ActionSpeakString("Hello")));//Eventually, we callActionDoCommand(FadeToBlack(OBJECT_SELF, FADE_SPEED_FAST));ActionWait(2.0);ActionDoCommand(SetCutsceneMode(OBJECT_SELF, FALSE));//Destroy the copyActionDoCommand(DestroyObject(GetLocalObject(GetModule(), "pccopy")));ActionDoCommand(RemoveEffect(OBJECT_SELF, eInv));ActionDoCommand(FadeFromBlack(OBJECT_SELF, FADE_SPEED_FAST));}//Function for creating a copy of the PCvoid CreateCopy(object oPC = OBJECT_SELF){object oCopy=CopyObject(oPC, GetLocation(oPC));//Make sure the copy likes the PCSetIsTemporaryFriend(oPC, oCopy);//Store so we can destroy later(GetModule(), "pccopy", oCopy);}
#### See Also
functions:  |   StopFade   

constants:  |   FADE_SPEED_* Constants   
events:  |   OnCutsceneAbort Event
