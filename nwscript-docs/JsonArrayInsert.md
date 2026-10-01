<!-- Source: https://nwnlexicon.com/index.php/JsonArrayInsert -->

# JsonArrayInsert(json, json, int)

Returns a modified copy of jArray with jValue inserted at position nIndex. 
json JsonArrayInsert( json jArray, json jValue, int nIndex = -1);
### Parameters 

jArray
    The json Array to modify. 

jValue
    The json value to insert. 

nIndex
    The index to insert for a value.
#### Description
Returns a modified copy of jArray with jValue inserted at position nIndex. All succeeding objects in the array will move by one. 
#### Remarks
By default (-1), inserts objects at the end of the array ("push"). nIndex = 0 inserts at the beginning of the array. Returns a json null value if jArray is not actually an array, with JsonGetError filled in. Returns a json null value if nIndex is not 0 or -1 and out of bounds, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
