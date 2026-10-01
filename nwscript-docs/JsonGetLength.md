<!-- Source: https://nwnlexicon.com/index.php?title=JsonGetLength&amp;action=history -->

# JsonGetLength(json)

Returns the length of the given json type. 
int JsonGetLength( json jValue);
### Parameters 

jValue
    The json data to analyze.
#### Description
Returns the length of the given json type. For objects, returns the number of top-level keys present. For arrays, returns the number of elements. Null types are of size 0. All other types return 1. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
