<!-- Source: https://nwnlexicon.com/index.php/JsonArrayDel -->

# JsonArrayDel(json, int)

Returns a modified copy of jArray with the element at position nIndex removed, and the array resized by one. 
json JsonArrayDel( json jArray, int nIndex);
### Parameters 

jArray
    The json Array to modify. 

nIndex
    The index to set for a value.
#### Description
Returns a modified copy of jArray with the element at position nIndex removed, and the array resized by one. 
#### Remarks
Returns a json null value if jArray is not actually an array, with JsonGetError filled in. Returns a json null value if nIndex is out of bounds, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
