<!-- Source: https://nwnlexicon.com/index.php?title=JsonPatch&amp;action=history -->

# JsonPatch(json, json)

Returns a modified version of jData patched by jPatch, according to the rules described below. 
json JsonPatch( json jData, json jPatch);
## Parameters 

jData
    json data to patch 

jPatch
    a json array of patch elements to apply to jData
## Description
Returns a modified version of jData patched by jPatch, according to the rules described below. 
## Remarks
See JsonPointer for documentation on the pointer syntax. 
Returns a json null value on error, with JsonGetError filled in. jPatch is an array of patch elements, each containing a op, a path, and a value field. Example: 
```
[
 { "op": "replace", "path": "/baz", "value": "boo" },
 { "op": "add", "path": "/hello", "value": ["world"] },
 { "op": "remove", "path": "/foo"}
]

```

Valid operations are: add, remove, replace, move, copy, test 
See RFC7386 for details on the patch rules. 
## Operations
Copied from <https://jsonpatch.com>: 
### Add
```
{ "op": "add", "path": "/biscuits/1", "value": { "name": "Ginger Nut" } }

```

Adds a value to an object or inserts it into an array. In the case of an array, the value is inserted before the given index. The `-` character can be used instead of an index to insert at the end of an array. 
If the root of the json being patched is an object, any missing keys in the pointer will be added. If the document root is an array, missing keys will result in a null value with the error set. 
### Remove
```
{ "op": "remove", "path": "/biscuits" }

```

Removes a value from an object or array. 
```
{ "op": "remove", "path": "/biscuits/0" }

```

Removes the first element of the array at `biscuits` (or just removes the "0" key if `biscuits` is an object) 
Attempting to remove a path that does not exist is an error. 
### Replace
```
{ "op": "replace", "path": "/biscuits/0/name", "value": "Chocolate Digestive" }

```

Replaces a value. Equivalent to a "remove" followed by an "add". 
### Copy
```
{ "op": "copy", "from": "/biscuits/0", "path": "/best_biscuit" }

```

Copies a value from one location to another within the JSON document. Both `from` and `path` are JSON Pointers. 
### Move
```
{ "op": "move", "from": "/biscuits", "path": "/cookies" }

```

Moves a value from one location to the other. Both `from` and `path` are JSON Pointers. 
### Test
```
{ "op": "test", "path": "/best_biscuit/name", "value": "Choco Leibniz" }

```

Tests that the specified value is set in the document. If the test fails, then the patch as a whole should not apply. 
## Version
This function was added in 1.85.8193.31 of NWN:EE. 
## Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

## See Also
functions:  |  JSON Functions
