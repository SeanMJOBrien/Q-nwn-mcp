<!-- Source: https://nwnlexicon.com/index.php/JsonObjectSet -->

# JsonObjectSet(json, string, json)

Returns a modified copy of jObject with the key at sKey set to jValue. 
json JsonObjectSet( json jObject, string sKey, json jValue);
### Parameters 

jObject
    The json Object to modify. 

sKey
    The key to set for a value. 

jValue
    The json value to set.
#### Description
Returns a modified copy of jObject with the key at sKey set to jValue. 
#### Remarks
Returns a json null value if jObject is not a object, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions, JsonObjectGet
