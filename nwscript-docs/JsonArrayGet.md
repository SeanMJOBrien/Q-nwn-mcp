<!-- Source: https://nwnlexicon.com/index.php?title=JsonArrayGet&amp;action=history -->

# JsonArrayGet(json, int)

Gets the json object at jArray index position nIndex. 
json JsonArrayGet( json jArray, int nIndex);
### Parameters 

jArray
    The json Array to query. 

nIndex
    The array index to read.
#### Description
Gets the json object at jArray index position nIndex. 
#### Remarks
Check the bounds of an array with JsonGetLength(jArray) if using this function. 
Returns a json null value if the index is out of bounds, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
