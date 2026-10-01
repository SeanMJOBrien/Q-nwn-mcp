<!-- Source: https://nwnlexicon.com/index.php?title=JsonMerge&amp;action=history -->

# JsonMerge(json, json )

Returns a modified copy of jData with jMerge merged into it. 
json JsonMerge( json jData, json jMerge );
### Parameters 

jData
    json data to modify 

jMerge
    json data to merge into jData
#### Description
Returns a modified copy of jData with jMerge merged into it. This is an alternative to JsonPatch and JsonDiff, with a syntax more closely resembling the final object. 
#### Remarks
See RFC6901 for details. Returns a json null value on error, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
