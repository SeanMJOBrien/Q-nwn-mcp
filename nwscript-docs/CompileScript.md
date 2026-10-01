<!-- Source: https://nwnlexicon.com/index.php/CompileScript -->

# CompileScript(string, string, int, int)

Compile a script and place it in the server's CURRENTGAME: folder. 
string CompileScript( string sScriptName, string sScriptData, int bWrapIntoMain = FALSE, int bGenerateNDB = FALSE);
#### Parameters 

sScriptName
    The name of the script to compile. 

sScriptData
    The script. 

bWrapIntoMain
    if TRUE, the "void main() {}" wrapper will be added to the script for you. 

bGenerateNDB
    if TRUE, the .ndb debug file will be generated for the script.
#### Description
Compile a script and place it in the server's CURRENTGAME: folder. 
Note: Scripts will persist for as long as the module is running. 
SinglePlayer / Saves: Scripts that overwrite existing module scripts will persist to the save file. New scripts, unknown to the module, will have to be re-compiled on module load when loading a save. Returns "" on success or the error on failure. 
Returns "" on success or the error on failure. 
#### Remarks
This can be used to dynamically compile a brand new script, which may be useful for advanced cases where a new dynamic script contents is required. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  ExecuteScript() ExecuteScriptChunk()
