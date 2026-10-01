<!-- Source: https://nwnlexicon.com/index.php/DelayCommand -->

# DelayCommand(float, action)
Delays an assigned action for a period of time. 
void DelayCommand( float fSeconds, action aActionToDelay);
### Parameters 

fSeconds
    Number of seconds to delay the command by. 

aActionToDelay
    Action in the Action Queue to delay.
### Description
Delay aActionToDelay by fSeconds. If an error occurs the log file will contain "DelayCommand failed.". 
DelayCommand() is paused/inactive when EffectTimeStop() is in effect. 
### Remarks
DelayCommand() may not work as expected if used multiple times in the same script - the script state at the time of DelayCommand being executed will be copied to be run in context later (eg global variables). See the first script example for how this works. 
A DelayCommand() is executed essentially on OBJECT_SELF (the caller of it). When an object dies all DelayCommand() calls on it will immediately stop. Under no other circumstances should the DelayCommand() call fail (although if itself calls, say, a repeating loop it may have a TMI issued to stop it). 
It can be used to call itself - a sort of "Heartbeat" event. However this can also cause performance issues just like a complex Heartbeat script. 
Since invalid objects can't execute stuff inside DelayCommand()s, meaning that DelayCommand() should not be used in OnDeath events, or after a call to DestroyObject(OBJECT_SELF); - use AssignCommand() or ExecuteScript() to call it from elsewhere. 
If a function is called, the function acts without context of any changed global variables or context other than the parameters passed to it. Think of it as a sort of ExecuteScriptChunk. This means you have to be careful when crafting the use of DelayCommand() in a larger script. 
Note that, though it takes an action "Action \(datatype\)") type as a parameter, you cannot create your own "action" variables (e.g., you cannot write action aDo = SendMessageToPC(oPC, "Message"); You need to put the actual SendMessage() (or whatever) inside the DelayCommand() call - you can't use the action keyword as a pointer to a function. In fact, the action keyword is unusable, except that BioWare can put it in function declarations, apparently. But we can't use it in function declarations ourselves. 
Also, please note that the delay starts when the function containing the call to DelayCommand() finishes. So even no delay at all: DelayCommand(0.0f, ActionToDo()); will postpone the execution of ActionToDo() until after everything else in the same function has finished. 
As of HotU, DelayCommand()'s order, if used with the same delay, has been swapped for performance reasons. A script with: 
DelayCommand(10.0, Foobar());DelayCommand(10.0, Nothing());
...will now call Nothing() before Foobar(). This is unlikely to affect anything and it is much better to put both Foobar() and Nothing() in a wrapper as noted in Known Bugs and the Code below. 
All functions passed within the DelayCommand function are not executed until the delay has passed. This means that DelayCommand(6.0, Foobar(GetLocation(OBJECT_SELF))) will pass the location of OBJECT_SELF after those 6 seconds, and not the location at the time the DelayCommand function is first called. 
For the safest way of passing variables to DelayCommand() see the example in the second script below. 
### Known Bugs
DelayCommand() can now be used in area transitions without losing the command. 
Also note that using DelayCommand() on consecutive lines with the same amount of delay may produce unexpected results as of the HotU release. Your code is less likely to break and will be more efficient if you place the sequence of actions in a separate function and then delay the call to that function. See code example below. 
DelayCommand() does not work on Encounters. <ref>"DelayCommand and Encounters" Thread on the BioBoards</ref>
### Version
At some point DelayCommand() was capped to 1 game day, this is no longer the case. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed sqlite database transaction rollback not working correctly in DelayCommands. 
### Example
// Example to show the usage of globals interacting with DelayCommand()// Global variables are copied when DelayCommand is executed// Therefore the second IncreaseN will not see the increased value of N that the first one does.int n = 1; // Global variablevoid IncreaseN(){ n++; PrintInteger(n);} void main() { PrintInteger(n); // Prints "1" n++; DelayCommand(0.1f, IncreaseN()); // Prints "3" DelayCommand(0.2f, IncreaseN()); // Prints "3"}
// The old way of doing itvoid main(){ //Make the NPC "NW_BOY" do something with the item "NW_PICKUP" object oNPC = GetObjectByTag("NW_BOY"); object oPickObj = GetObjectByTag("NW_PICKUP"); // Tell anyone nearby that they are leaving DelayCommand(3.0f, AssignCommand(oNPC, SpeakString("I'm going.", TALKVOLUME_TALK))); // Walk over to oPickObj and pick it up DelayCommand(3.0f, AssignCommand(oNPC, ActionPickUpItem(oPickObj))); // Destroy NPC DelayCommand(3.0f, AssignCommand(oNPC, ActionDoCommand(DestroyObject(oNPC))));}// The new way of doing itvoid DoIt(object oNPC, object oPickObj){ // Tell anyone nearby that they are leaving AssignCommand(oNPC, SpeakString("I'm going.", TALKVOLUME_TALK)); // Walk over to oPickObj and pick it up AssignCommand(oNPC, ActionPickUpItem(oPickObj)); // Destroy NPC AssignCommand(oNPC, ActionDoCommand(DestroyObject(oNPC)));}void main(){ //Make the NPC "NW_BOY" do something with the item "NW_PICKUP" DelayCommand(3.0f, DoIt(GetObjectByTag("NW_BOY"), GetObjectByTag("NW_PICKUP")));}
A further example shows how best to pass variables to a DelayCommand very safely; along with ExecuteScript and AssignCommand usage. 
void main(){ // There are a lot of use cases for DelayCommand, AssignCommand and ExecuteScript. Some best practices for all 3: object oNPC = GetObjectByTag("my_favorite_npc"); object oModule = GetModule(); // This will fire the script "npc_script" after 10 seconds on oNPC. However: // - If we (OBJECT_SELF) die/are destroyed, it will not execute the script at all // - If oNPC doesn't exist the script will not be executed // This is not recommended except for if OBJECT_SELF is always valid (eg: being called from a module script), even // then you have no idea if it will execute safely if oNPC dies in the intervening time DelayCommand(10.0, ExecuteScript("npc_script", oNPC)); // AssignCommand could help work around the caller of this script dying meaning unintended behaviour // Here we immediately assign the DelayCommand to oNPC, but what is ExecuteScript() running on? oNPC or OBJECT_SELF? Unclear. AssignCommand(oNPC, DelayCommand(10.0, ExecuteScript("npc_script", OBJECT_SELF))); // A little better - now we know that the ExecuteScript will always run on oNPC, a lot clearer! // AssignCommand() on a creature object can fail - eg if SetCommandable() is set to FALSE AssignCommand(oNPC, DelayCommand(10.0, ExecuteScript("npc_script", oNPC))); // So we can make it safer by assigning the command to oModule, to execute a script on oTarget. // Safer but we still can have times this will fail silently, mainly if oNPC is dead/destroyed AssignCommand(oModule, DelayCommand(10.0, ExecuteScript("npc_script", oNPC))); // For fire and forget delays with no AssignCommand you could put in a script that executes immediately that itself  // calls DelayCommand(). This still has issues if oNPC dies ExecuteScript("delay_npc_script", oNPC); // For things that must run, regardless of oNPC or OBJECT_SELF existing, use this method // You make the module do the script, which will always exist, and it does a DelayCommand() to itself to do a future script call // which can then ExecuteScript() on the oNPC if it exists, and sends a debug message if it doesn't. SetLocalObject(oModule, "DELAY_NPC_OBJ", oNPC); ExecuteScript("delay_npc_modsc", oModule);}// npc_scriptvoid main(){ SpeakString("Hello!"); }// delay_npc_scriptvoid main(){ DelayComand(10.0, ExecuteScript("npc_script", oHello)) }// delay_npc_modscvoid main(){ DelayComand(10.0, ExecuteScript("mod_npc_script", OBJECT_SELF)); }// mod_npc_scriptvoid main(){ // Get and delete the passed through variable object oModule = OBJECT_SELF; object oNPC = GetLocalObject(oModule, "DELAY_NPC_OBJ"); // Valid NPC we can do the npc_script immediately if(GetIsObjectValid(oNPC)) { ExecuteScript("npc_script", oNPC); } else { // Something went wrong, where is oNPC! Debug message to first PC. SendMessageToPC(GetFirstPC(), "Error, NPC not found for delayed npc_script call!"); }}
### See Also
functions:  | EffectTimeStop  

### References
<references />
