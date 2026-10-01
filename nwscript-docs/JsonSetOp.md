<!-- Source: https://nwnlexicon.com/index.php?title=JsonSetOp&amp;action=history -->

# JsonSetOp(json, int, json)

Runs a set operation on two json arrays. 
json JsonSetOp( json jValue, int nOp, json jOther);
### Parameters 

jValue
    The value json array 

nOp
    The operation to do, JSON_SET_* constants 

jOther
    The other json array
#### Description
Returns the result of a set operation on two arrays. 
Operations: 
  * JSON_SET_SUBSET (v <= o) 
    * Returns true if every element in jOther is also in jValue. (Note where each value is located when comparing)
  * JSON_SET_UNION (v | o): 
    * Returns a new array containing values from both sides.
  * JSON_SET_INTERSECT (v & o): 
    * Returns a new array containing only values common to both sides.
  * JSON_SET_DIFFERENCE (v - o): 
    * Returns a new array containing only values not in jOther.
  * JSON_SET_SYMMETRIC_DIFFERENCE (v ^ o): 
    * Returns a new array containing all elements present in either array, but not both.

#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
