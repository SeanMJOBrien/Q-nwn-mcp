<!-- Source: https://nwnlexicon.com/index.php/JsonPointer -->

# JsonPointer(json, string)

Returns the element at the given json pointer value. 
json JsonPointer( json jData, string sPointer);
### Parameters 

jData
    json data to query 

sPointer
    string pointer, see link below
#### Description
Returns the element at the given json pointer value. 
#### Remarks
See RFC6901 for details. Returns a json null value on error, with JsonGetError filled in. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
For example, given the JSON document: 
```
 {
  "foo": ["bar", "baz"],
  "": 0,
  "a/b": 1,
  "c%d": 2,
  "e^f": 3,
  "g|h": 4,
  "i\\j": 5,
  "k\"l": 6,
  " ": 7,
  "m~n": 8
 }

```

The following JSON strings evaluate to the accompanying values: 
```
 ""      // the whole document
 "/foo"    ["bar", "baz"]
 "/foo/0"   "bar"
 "/"     0
 "/a~1b"   1
 "/c%d"    2
 "/e^f"    3
 "/g|h"    4
 "/i\\j"   5
 "/k\"l"   6
 "/ "     7
 "/m~0n"   8

```
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
