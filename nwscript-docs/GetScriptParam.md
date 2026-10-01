<!-- Source: https://nwnlexicon.com/index.php/GetScriptParam -->

# GetScriptParam(string)

Returns the script parameter value for a given parameter name. 
string GetScriptParam( string sParamName);
### Parameters 

sParamName
    The script parameter to retrieve
### Description
Returns the script parameter value for a given parameter name. 
Script parameters can be set for conversation scripts in the toolset's Conversation Editor, or for any script with SetScriptParam. 
If ExecuteScript or ExecuteScriptChunk is used, if called in those it will only get SetScriptParam-set variables. Each execution will cause a new nwscript VM instance with it's own values. The originals from the original script or a different ExecuteScript would not be lost in these cases. 
Will return "" if a parameter with the given name does not exist. 
### Remarks
This integrates well into the toolset changes in the patch which introduce a way to add variables to pass to scripts. This makes hundreds, if not thousands, of conditional and action scripts in conversations a thing of the past. A simple example is provided below. 
Given SetScriptParam it also allows a single script to be reused with ExecuteScript. For instance you can have a quest reward script that tests a parameter for if it is in a conversation or not - eg: GetScriptParam("NO_CONVERSATION") - and if it detects it acts as if the object it is being executed on, or some other person (eg: an object stored in a variable), is to be referenced instead of GetPCSpeaker for, say, rewarding experience or advancing a quest. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// Example of a multi-use script for conversation actions.// We will do several things to the PC speaker based on the parameters passed in. More than one can happen at once:// * hostile = If set to anything, we attack// * gold = we grant them this amount of gold// * xp = we grant them this amount of xp// * item = we create 1 of this item on themvoid main(){ object oPC = GetPCSpeaker(); // Check each parameter in turn (we could have more than one) string sParameter = GetScriptParam("hostile"); if(sParameter != "") { SetIsTemporaryEnemy(oPC); ActionAttack(oPC); } sParameter = GetScriptParam("gold"); if(sParameter != "") { GiveGoldToCreature(oPC, StringToInt(sParameter)); } sParameter = GetScriptParam("xp"); if(sParameter != "") { GiveXPToCreature(oPC, StringToInt(sParameter)); } sParameter = GetScriptParam("item"); if(sParameter != "") { object oItem = CreateItemOnObject(sParameter, oPC, 1); if((oItem)) { SpeakString("ERROR: Item parameter invalid: " + sParameter, TALKVOLUME_SHOUT); } }}
### See Also
functions:  |  SetScriptParam ExecuteScript
