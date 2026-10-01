<!-- Source: https://nwnlexicon.com/index.php/ExecuteScriptChunk -->

# ExecuteScriptChunk(string, object, int)

Execute a script chunk. 
string ExecuteScriptChunk( string sScriptChunk, object oObject=OBJECT_SELF, int bWrapIntoMain=TRUE);
### Parameters 

sScriptChunk
    This string is the script chunk to compile and run on the fly. 

oObject
    The object assigned to execute the script chunk. (Default: OBJECT_SELF) 

bWrapIntoMain
    Setting this parameter to TRUE wraps sScriptChunk with void main() {}. (Default: TRUE)
### Description
Execute a script chunk. 
The script chunk runs immediately, same as ExecuteScript(). 
The script is jitted in place and currently not cached: Each invocation will recompile the script chunk. 
Note that the script chunk will run as if a separate script. This is not eval(). 
By default, the script chunk is wrapped into void main() {}. Pass in bWrapIntoMain = FALSE to override. 
Returns "" on success, or the compilation error. 
### Remarks
Make sure that any quotes are escaped properly, as in the example code below. 
For dynamic use you can, quite dangerously, use this to execute chat captured in game by capturing listening events on a creature or using a map note contents. This is not recommended for a live module but may be useful for quickly debugging (although less useful now the developer console has a NWscript debug panel). 
One other more dynamic use may be to pass parameters using new GetScriptParam() and SetScriptParam() functions, the variable set in a conversation node being some code to run for instance. 
### Version
This function was added in 1.74.8188 of NWN:EE. 
### Example
// Example 1: execute a one liner call to boot the first pc found from the server.//ExecuteScriptChunk("BootPC(GetFirstPC());");// Example 2: execute a function from an include file.//ExecuteScriptChunk("#include \"inc_foo\"\n void main() { do_foo(); }", oTaro, false);// Thank you to Sherincall in the Neverwinter Vault Discord chat for sharing these examples.
Example of a useful use for getting a constants value (eg; if used as a GetScriptParam string in a conversation): 
int StringConstantToInt(string sConstant, int nErrorValue = 0){ SetLocalInt(GetModule(), "SCTI", nErrorValue); ExecuteScriptChunk("SetLocalInt(GetModule(), \"SCTI\", " + sConstant + " );", GetModule()); return GetLocalInt(GetModule(), "SCTI");}void main(){ // Example written param would be ABILITY_STRENGTH int nAbility = StringConstantToInt(GetScriptParam("ability"), -1); // Error catching if(nAbility == -1) return; effect eAbility = EffectAbilityIncrease(nAbility, 10); ApplyEffectToObject(DURATION_TYPE_PERMANENT, eAbility, GetPCSpeaker());}
### See Also
functions:  | ExecuteScript() GetScriptChunk() GetScriptName() GetScriptRecursionLevel()
