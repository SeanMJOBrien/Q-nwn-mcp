<!-- Source: https://nwnlexicon.com/index.php/JsonGetInt -->

# JsonGetInt(json)

Returns an integer representation of the json value, casting where possible. 
int JsonGetInt( json jValue);
### Parameters 

jValue
    The json to return as an integer.
#### Description
Returns an integer representation of the json value, casting where possible. 
#### Remarks
Returns 0 if the value cannot be represented as an integer. Use this to parse json bool types. NB: This will narrow down to signed 32 bit, as that is what NWScript int is. If you are trying to read a 64 bit or unsigned integer that doesn't fit into int32, you will lose data. You will not lose data if you keep the value as a json element (via Object/ArrayGet). 
Despite the function claims it will cast the value, integers stored originally using JsonString will return 0. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
