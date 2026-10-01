<!-- Source: https://nwnlexicon.com/index.php?title=JsonParse&amp;action=history -->

# JsonParse(string)

Parse the given string as a valid json value, and returns the corresponding type. 
json JsonParse( string sJson);
### Parameters 

sJson
    The string to parse into json.
#### Description
Parse the given string as a valid json value, and returns the corresponding type. 
#### Remarks
Returns a JSON_TYPE_NULL on error. 
Check JsonGetError to see the parse error, if any. 
NB: The parsed string needs to be in game-local encoding, but the generated json structure will contain UTF-8 data. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
// First way to initialise an array:json jArray = JsonArray();jArray = JsonArrayInsert(jArray, JsonInt(1));jArray = JsonArrayInsert(jArray, JsonInt(5));jArray = JsonArrayInsert(jArray, JsonInt(10));// Method with JsonParse:json jArray = JsonParse("[1, 5, 10]");
#### See Also
functions:  |  JSON Functions
