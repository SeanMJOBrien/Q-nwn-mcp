<!-- Source: https://nwnlexicon.com/index.php/ObjectToString -->

# ObjectToString(object)
Converts an object into a hexadecimal string. 
string ObjectToString( object oObject);
#### Parameters 

oObject
    The object to convert into a string.
#### Description
Convert oObject into a hexadecimal string. 
This can be used for debug messages or for storing an object reference in a database with SqlBindString, and retrieving it using the counterpart StringToObject. 
#### Remarks
This is totally unique - no other object (at the exact time) will have that reference in the same module instance. It persists in save games as well. It is probably the best unique identifier for NPC creatures since they don't persist after a server restart. 
It is insanely useful - more so then GetName() and GetTag() to debug exact object's scripts - ObjectToString(OBJECT_SELF) can return an object string for anything. Because it is unique, it can pinpoint exact problems in large scripting tasks. 
For SQL it is useful since otherwise you have to store resref, tag or another potentially not unique identifier. StringToObject can convert the ID back into a usable object for nwscript use. 
**Note:** Object IDs are only valid for the current game. A persistent world that is restarted should scrub any usage of these identifiers, although they would be safe to use for the save game database (module). Player databases shouldn't use this, since joining a module will reset all their inventory object IDs. You can use UUID identifiers instead for persistence since that field is stored on the object. 
#### Version
1.22 
#### See Also
functions:  | StringToObject SqlBindString SqlGetString
