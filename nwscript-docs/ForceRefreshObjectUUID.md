<!-- Source: https://nwnlexicon.com/index.php?title=ForceRefreshObjectUUID&amp;action=history -->

# ForceRefreshObjectUUID(object)

Forces the given object to receive a new UUID, discarding the current value. 
void ForceRefreshObjectUUID( object oObject);
### Parameters 

oObject
    A target object, which is re-assign a new UUID by this function.
### Description
Forces the given object to receive a new UUID, discarding the current value. 
### Remarks
Use this to refresh, for instance, cloned/copied items that may have a now clashing UUID. Or just to force it to have a new UUID if you script references to the old one you want to intentionally break. 
UUIDs can uniquely mark any object beyond a server restart. This is generally used for persistent things such as serialised objects, and player inventory items, but can be anything such as finding a unique instance of a particular NPC which would otherwise be impossible due to exactly the same tag and resref as dozens of others. 
### Version
This function was added in 1.74.8188 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetObjectByUUID, GetObjectUUID, GetRandomUUID
