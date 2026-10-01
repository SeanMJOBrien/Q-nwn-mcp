<!-- Source: https://nwnlexicon.com/index.php?title=JsonDiff&amp;action=history -->

# JsonDiff(json, json)

Returns the diff (described as a json structure you can pass into JsonPatch) between the two objects. 
json JsonDiff( json jLHS, json jRHS);
### Parameters 

jLHS
    first json data to compare 

jRHS
    second json data to compare
#### Description
Returns the diff (described as a json structure you can pass into JsonPatch) between the two objects. 
#### Remarks
Returns a json null value on error, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
