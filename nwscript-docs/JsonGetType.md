<!-- Source: https://nwnlexicon.com/index.php/JsonGetType -->

# JsonGetType(json)

Describes the type of the given json value. 
int JsonGetType( json jValue);
### Parameters 

jValue
    The json to analyze.
#### Description
Returns a  JSON_TYPE_* constant. 
#### Remarks
Returns JSON_TYPE_NULL if the value is empty. Testing JSON_TYPE_NULL is a good standard for testing Json validity (compared to testing return values being blank). 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
