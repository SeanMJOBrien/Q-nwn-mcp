<!-- Source: https://nwnlexicon.com/index.php?title=JsonArraySet&amp;action=history -->

# JsonArraySet(json, int, json)

Returns a modified copy of jArray with position nIndex set to jValue. 
json JsonArraySet( json jArray, int nIndex, json jValue);
### Parameters 

jArray
    The json Array to modify. 

nIndex
    The index to set for a value. 

jValue
    The json value to set.
#### Description
Returns a modified copy of jArray with position nIndex set to jValue. 
#### Remarks
Returns a json null value if jArray is not actually an array, with JsonGetError filled in. Returns a json null value if nIndex is out of bounds, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
