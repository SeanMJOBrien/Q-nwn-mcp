<!-- Source: https://nwnlexicon.com/index.php/StringToObject -->

# StringToObject( string )

Convert sHex, a string containing a hexadecimal object id, into a object reference. 
object StringToObject( string sHex);
### Parameters 

sHex
    A string containing a hexadecimal object id.
### Description
Convert sHex, a string containing a hexadecimal object id, into an object reference. Counterpart to ObjectToString. 
### Remarks
Since this converts from ObjectToString (which outputs a string such as "0x040105001") the obvious use is being able to store objects as strings for later use. This mainly applies to the newest SQLite database functionality where the concept of an "object" isn't available. 
Of course if you are using this function it is recommended to use GetIsObjectValid **not** != OBJECT_INVALID to check it is a valid reference, and possibly GetObjectType to check it is of the expected type. Running this on old objects stored with ObjectToString after a module reset is _not_ recommended at all since all object IDs will be reset. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | ObjectToString SqlBindString SqlGetString
