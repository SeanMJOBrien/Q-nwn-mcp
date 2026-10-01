<!-- Source: https://nwnlexicon.com/index.php?title=JsonArrayTransform&amp;action=history -->

# JsonArrayTransform(json, int)

Create a empty json array. 
json JsonArrayTransform( json jArray, int nTransform);
### Parameters 

jArray
    json array to transform 

nTransform
    JSON_ARRAY_* transformation to perform
#### Description
Returns a modified copy of jArray with the value order changed according to nTransform: 
  * JSON_ARRAY_SORT_ASCENDING, JSON_ARRAY_SORT_DESCENDING - Sorting is dependent on the type and follows json standards (.e.g. 99 < "100").
  * JSON_ARRAY_SHUFFLE - Randomises the order of elements.
  * JSON_ARRAY_REVERSE - Reverses the array.
  * JSON_ARRAY_UNIQUE - Returns a modified copy of jArray with duplicate values removed. Coercable but different types are not considered equal (e.g. 99 != "99"); int/float equivalence however applies: 4.0 == 4. Order is preserved.
  * JSON_ARRAY_COALESCE - Returns the first non-null entry. Empty-ish values (e.g. "", 0) are not considered null, only the json scalar type.

#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
