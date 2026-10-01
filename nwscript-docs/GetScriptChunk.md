<!-- Source: https://nwnlexicon.com/index.php?title=GetScriptChunk&amp;action=history -->

# GetScriptChunk(int)

Get the script chunk attached to a script recursion level. 
string GetScriptChunk( int nRecursionLevel = -1);
#### Parameters 

nRecursionLevel
    Between 0 and <= GetScriptRecursionLevel() or -1 for the current recursion level.
#### Description
Get the script chunk attached to a script recursion level. 
Returns the script chunk or "" on error / no script chunk attached. 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | ExecuteScript() ExecuteScriptChunk() GetScriptName() GetScriptRecursionLevel()
