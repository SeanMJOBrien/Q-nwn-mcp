<!-- Source: https://nwnlexicon.com/index.php?title=JsonFind&amp;action=history -->

# JsonFind(json, json, int, int)

Finds a json needle in a json haystack. 
json JsonFind( json jHaystack, json jNeedle, int nNth = 0, int nConditional = JSON_FIND_EQUAL);
### Parameters 

jHaystack
    The json to search 

jNeedle
    The json to find 

nNth
    0-indexed item to find (Default: 0) 

nConditional
    Type of find to do, JSON_FIND_* constant (Default: JSON_FIND_EQUAL)
#### Description
Returns the nth-matching index or key of jNeedle in jHaystack. 
Supported haystacks: object, array 
Ordering behaviour for objects is unspecified. 
Return null when not found or on any error. 
#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
