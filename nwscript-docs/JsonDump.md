<!-- Source: https://nwnlexicon.com/index.php/JsonDump -->

# JsonDump(json, int)

Dump the given json value into a string that can be read back in via JsonParse. 
string JsonDump( json jValue, int nIndent = -1);
### Parameters 

jValue
    The json to dump into a string. 

nIndent
    describes the indentation level for pretty-printing; the default value of -1 means no indentation and no linebreaks.
#### Description
Dump the given json value into a string that can be read back in via JsonParse. 
nIndent describes the indentation level for pretty-printing; a value of -1 means no indentation and no linebreaks. 
Returns a string describing JSON_TYPE_NULL on error. 
#### Remarks
NB: The dumped string is in game-local encoding, with all non-ascii characters escaped. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
// Debug a objects JSON by printing it to the log. // If it's a simple object you could also print to the PCs chat window // with SendMessageToPC.// In both cases it will clear all non-ASCII characters.void main(){ object oObject = OBJECT_SELF; json jObject = ObjectToJson(oObject); // We format it more nicely with indent of 2. // Keep it at -1 if you need it to be efficient WriteTimestampedLogEntry(JsonDump(jObject, 2));}
#### See Also
functions:  |  JSON Functions
