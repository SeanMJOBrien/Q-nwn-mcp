<!-- Source: https://nwnlexicon.com/index.php?title=GetObjectByUUID&amp;action=history -->

# GetObjectByUUID(string)

Looks up a object on the server by it's UUID. 
object GetObjectByUUID( string sUUID);
### Parameters 

sUUID
    The sUUID of the target object to search for.
### Description
Looks up a object on the server by it's UUID. 
Returns OBJECT_INVALID if the UUID is not on the server. 
### Remarks
UUIDs can uniquely mark any object beyond a server restart. This is generally used for persistent things such as serialised objects, and player inventory items, but can be anything such as finding a unique instance of a particular NPC which would otherwise be impossible due to exactly the same tag and resref as dozens of others. 
### Version
This function was added in 1.74.8188 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | ForceRefreshObjectUUID, GetObjectUUID, GetRandomUUID
