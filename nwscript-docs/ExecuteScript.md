<!-- Source: https://nwnlexicon.com/index.php/ExecuteScript -->

# ExecuteScript(string, object)
Cause a script to execute. 
void ExecuteScript( string sScript, object oTarget);
### Parameters 

sScript
    Name of the script to execute 

oTarget
    The object that will run the script and within the script will be referenced as OBJECT_SELF
### Description
Cause oTarget to run sScript as if called from an event and then return execution to the calling script. 
The advantage of executing the script as if it were called by an event is, default variables like OBJECT_SELF are valid and initialized to oTarget. Additionally, references to possession and inventory are defaulted to oTarget. This makes scripts needed by say, OnUsed events on placeable items or the OnActivateItem module event, easier to write and manage. 
If sScript does not specify a valid compiled script in your module, nothing happens. 
ExecuteScript() run inline will add to the instruction count of the calling script, potentially calling a Too Many Instructions (TMI) if the script called is running too many instructions. Essentially you can't escape the TMI count with a new ExecuteScript(). However a DelayCommand(0.0, ExecuteScript()) will cause an entirely new script instance to run independantly AFTER the first script has run, and not inline, thus a new counter is run for that execution. 
You can run a string of code with ExecuteScriptChunk, see that function definition for more information. 
### Remarks
sScript must be the name of a script in your module's list of scripts. 
sScript does not take into account "lower" or "UPPER" case, it merely does what is present. It will also cut the input string to the limit of 16 characters automatically - useful for item-tag-based-scripting. 
ExecuteScript() has NO delay! It will run as soon as it is called, not after the current script has finished. You can use it to run a section of code on another object (or the same one), then get a return value (via. Set/GetLocalInt()) for what happened. See the code sample for an example of how to get return values from executed scripts. 
There is no way to get how a script is fired - be it a normal event, an ExecuteScript() call, or any other way. 
It is a very useful function to run with DelayCommand() when an action **must** take place. By using the module itself as the oTarget parameter this means it will always fire since it will always be assigned to a valid object. See the script below for a safe example of use. 
SetScriptParam() can be used to set key:value pairs for the next script ran, and works well if used directly before ExecuteScript() as it means local variables don't need to be set on the object. 
#### Depth Limit
Running ExecuteScript and ExecuteScriptChunk within an ExecuteScript can have issues; there is a depth limit. 
  * Depth 0: ExecuteScript{Chunk}() 
    * Depth 1: ExecuteScript{Chunk}() 
      * Depth 2: ExecuteScript{Chunk}() 
        * Depth 3: ExecuteScript{Chunk}()

Depth has a max of 8 
However ExecuteScript running multiple times in the top level script is fine; 
Depth 0: ExecuteScript{Chunk}() Depth 0: ExecuteScript{Chunk}() Depth 0: ExecuteScript{Chunk}() 
Each ExecuteScript{Chunk}() call here will execute its script/chunk at depth 1 and then return to depth 0 
### Version
1.62 
### Example
// Example 1 - Cause oTarget to execute the script // named "sc_example" as if it were called by one of oTarget's events.void main(){ ExecuteScript("sc_example", oTarget);}// Example 2: A simple demonstration of "returning" a value via.// ExecuteScript(), which can be useful.// Script 1: Calls the execute script and does something on // the return value. This scripts name doesn't mattervoid main(){ // Can be, for example, the heartbeat event, conversation action... // If we see a PC, we will run the script "PC_SEEN" (case doesn't // matter) and if that script returns TRUE (1) it will attack the PC object oPC = GetNearestCreature(CREATURE_TYPE_PERCEPTION, PERCEPTION_SEEN, OBJECT_SELF, 1, CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC, CREATURE_TYPE_IS_ALIVE, TRUE); // Get if valid if(GetIsObjectValid(oPC)) { // Run the script ExecuteScript("PC_SEEN", OBJECT_SELF); // Get the return value int nReturn = GetLocalInt(OBJECT_SELF, "PC_SEEN_RETURN_VALUE"); // If TRUE, we attack them! if(nReturn == TRUE) { ClearAllActions(); ActionAttack(oPC); } }}// Script 2: The PC_SEEN named script. This will set a local (the// return value) upon ourselves for the above script to function// correctly.void main(){ // We cannot get the "oPC" declared above, unless we set it // to a local object, or wanted to call the GetNearestCreature() // function again. // But, we only want to check a random variable. Why is it // in a separate script? Well, if we wanted, this script could // be called according to what tag the calling creature has, so // certain scripts will call for certain creatures. // Anyway, random check if(d100() >= 25) { // Attack! SetLocalInt(OBJECT_SELF, "PC_SEEN_RETURN_VALUE", TRUE); } else { // Do not attack SetLocalInt(OBJECT_SELF, "PC_SEEN_RETURN_VALUE", FALSE); }}
A further example shows how best to pass variables to a DelayCommand very safely; along with ExecuteScript and AssignCommand usage. 
void main(){ // There are a lot of use cases for DelayCommand, AssignCommand and ExecuteScript. Some best practices for all 3: object oNPC = GetObjectByTag("my_favorite_npc"); object oModule = GetModule(); // This will fire the script "npc_script" after 10 seconds on oNPC. However: // - If we (OBJECT_SELF) die/are destroyed, it will not execute the script at all // - If oNPC doesn't exist the script will not be executed // This is not recommended except for if OBJECT_SELF is always valid (eg: being called from a module script), even // then you have no idea if it will execute safely if oNPC dies in the intervening time DelayCommand(10.0, ExecuteScript("npc_script", oNPC)); // AssignCommand could help work around the caller of this script dying meaning unintended behaviour // Here we immediately assign the DelayCommand to oNPC, but what is ExecuteScript() running on? oNPC or OBJECT_SELF? Unclear. AssignCommand(oNPC, DelayCommand(10.0, ExecuteScript("npc_script", OBJECT_SELF))); // A little better - now we know that the ExecuteScript will always run on oNPC, a lot clearer! // AssignCommand() on a creature object can fail - eg if SetCommandable() is set to FALSE AssignCommand(oNPC, DelayCommand(10.0, ExecuteScript("npc_script", oNPC))); // So we can make it safer by assigning the command to oModule, to execute a script on oTarget. // Safer but we still can have times this will fail silently, mainly if oNPC is dead/destroyed AssignCommand(oModule, DelayCommand(10.0, ExecuteScript("npc_script", oNPC))); // For fire and forget delays with no AssignCommand you could put in a script that executes immediately that itself  // calls DelayCommand(). This still has issues if oNPC dies ExecuteScript("delay_npc_script", oNPC); // For things that must run, regardless of oNPC or OBJECT_SELF existing, use this method // You make the module do the script, which will always exist, and it does a DelayCommand() to itself to do a future script call // which can then ExecuteScript() on the oNPC if it exists, and sends a debug message if it doesn't. SetLocalObject(oModule, "DELAY_NPC_OBJ", oNPC); ExecuteScript("delay_npc_modsc", oModule);}// npc_scriptvoid main(){ SpeakString("Hello!"); }// delay_npc_scriptvoid main(){ DelayComand(10.0, ExecuteScript("npc_script", oHello)) }// delay_npc_modscvoid main(){ DelayComand(10.0, ExecuteScript("mod_npc_script", OBJECT_SELF)); }// mod_npc_scriptvoid main(){ // Get and delete the passed through variable object oModule = OBJECT_SELF; object oNPC = GetLocalObject(oModule, "DELAY_NPC_OBJ"); // Valid NPC we can do the npc_script immediately if(GetIsObjectValid(oNPC)) { ExecuteScript("npc_script", oNPC); } else { // Something went wrong, where is oNPC! Debug message to first PC. SendMessageToPC(GetFirstPC(), "Error, NPC not found for delayed npc_script call!"); }}
### See Also
functions:  | CompileScript() ExecuteScriptChunk()
