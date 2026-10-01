<!-- Source: https://nwnlexicon.com/index.php?title=SetScriptParam&amp;action=history -->

# SetScriptParam(string, string)

Set a script parameter value for the next script to be run. 
void SetScriptParam( string sParamName, string sParamValue);
### Parameters 

sParamName
    The script parameter to set 

sParamValue
    The value to set sParamName to
### Description
Set a script parameter value for the next script to be run. 
Call this function to set parameters right before calling ExecuteScript. 
When ExecuteScript or ExecuteScriptChunk is used, it will only get SetScriptParam variables not ones from the original script call. Each execution will cause a new nwscript VM instance with it's own values. The originals from the original script or a different ExecuteScript would not be lost in these cases. 
Further, if execution of a new script is queued as an action, it will not inherit variables set in the original script, either. The workaround is to queue a snippet which sets the parameter(s), then immediately executes the new script. 
### Remarks
This gives even more power to the toolset integrations into the toolset, since a general purpose script can be used in a conversation (a usual default) but a parameter could be set beforehand to use it in other ways, for instance rewarding a PC with gold an experience. 
For instance as in the example below you can have a quest reward script that tests a parameter for if it is in a conversation or not - eg: GetScriptParam("NO_CONVERSATION") - and if it detects it acts as if the object it is being executed on, or some other person (eg: an object stored in a variable), is to be referenced instead of GetPCSpeaker for, say, rewarding experience or advancing a quest. See example below. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// Example of a multi-use script for conversation actions.// We will do several things to the PC speaker based on the parameters passed in. More than one can happen at once:// * hostile = If set to anything, we attack// * gold = we grant them this amount of gold// * xp = we grant them this amount of xp// * item = we create 1 of this item on them// If "NO_CONVERSATION" is set we instead use the variable "TARGET" on ourselves to target the object retrieved.void main(){ object oPC; if(GetScriptParam("NO_CONVERSATION") != "") { // Get local object to use which should have been set just before executing this script // (PC's don't have a tag so we can't GetObjectByTag(GetScriptParam()) here) oPC = GetLocalObject(OBJECT_SELF, "TARGET"); // If not valid we assume the thing it is executed on is the target if((oPC)) oPC = OBJECT_SELF; } else { oPC = GetPCSpeaker(); } // Check each parameter in turn (we could have more than one) string sParameter = GetScriptParam("hostile"); if(sParameter != "") { SetIsTemporaryEnemy(oPC); ActionAttack(oPC); } sParameter = GetScriptParam("gold"); if(sParameter != "") { GiveGoldToCreature(oPC, StringToInt(sParameter)); } sParameter = GetScriptParam("xp"); if(sParameter != "") { GiveXPToCreature(oPC, StringToInt(sParameter)); } sParameter = GetScriptParam("item"); if(sParameter != "") { object oItem = CreateItemOnObject(sParameter, oPC, 1); if((oItem)) { SpeakString("ERROR: Item parameter invalid: " + sParameter, TALKVOLUME_SHOUT); } }}
### See Also
functions:  |  GetScriptParam ExecuteScript
