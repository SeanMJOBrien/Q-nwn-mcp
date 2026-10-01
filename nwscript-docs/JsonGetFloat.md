<!-- Source: https://nwnlexicon.com/index.php/JsonGetFloat -->

# JsonGetFloat(json)

Returns a float representation of the json value, casting where possible. 
float JsonGetFloat( json jValue);
### Parameters 

jValue
    The json to return as a float.
#### Description
Returns a float representation of the json value, casting where possible. 
#### Remarks
Returns a float representation of the json value, casting where possible. Returns 0.0 if the value cannot be represented as a float. NB: This will narrow doubles down to float. If you are trying to read a double, you will potentially lose precision. You will not lose data if you keep the value as a json element (via Object/ArrayGet). 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
