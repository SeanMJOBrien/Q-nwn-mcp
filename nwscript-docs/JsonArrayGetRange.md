<!-- Source: https://nwnlexicon.com/index.php/JsonArrayGetRange -->

# JsonArrayGetRange(json, int, int)

Returns a copy of the a range of values inside a json array. 
json JsonArrayGetRange( json jArray, int nBeginIndex, int nEndIndex);
### Parameters 

jArray
    The json to get a range of values from 

nBeginIndex
    Starting index number (note arrays start at value 0) 

nEndIndex
    Ending index number
#### Description
Returns a copy of the range (nBeginIndex, nEndIndex) inclusive of jArray. 
Negative nEndIndex values count from the other end. 
Out-of-bound values are clamped to the array range. 
Examples: 
json a = JsonParse("[0, 1, 2, 3, 4]"); JsonArrayGetRange(a, 0, 1) // => [0, 1] JsonArrayGetRange(a, 1, -1) // => [1, 2, 3, 4] JsonArrayGetRange(a, 0, 4) // => [0, 1, 2, 3, 4] JsonArrayGetRange(a, 0, 999) // => [0, 1, 2, 3, 4] JsonArrayGetRange(a, 1, 0) // => [] JsonArrayGetRange(a, 1, 1) // => [1]
Returns a null type on error, including type mismatches. 
#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
