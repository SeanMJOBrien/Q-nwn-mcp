<!-- Source: https://nwnlexicon.com/index.php?title=GetObjectUUID&amp;action=history -->

# GetObjectUUID(object)

Returns the given object's UUID. 
string GetObjectUUID( object oObject);
### Parameters 

oObject
    A target object, for which the UUID is returned by this function.
### Description
Returns the given object's UUID. This UUID is persisted across save boundaries, like StoreCampaignObject/RetrieveCampaignObject and save games. 
Thus, reidentification is only guaranteed in scenarios where players cannot introduce new objects (i.e., servervault servers). 
UUIDs are guaranteed to be unique in any single running game. 
If a loaded object would collide with a UUID already present in the game, the object receives no UUID, and a warning is emitted to the log. Requesting a UUID for the new object will generate a random one. 
This UUID is useful to, for example: 
- Safely identify servervault characters - Track serializable objects (like items or creatures) as they are saved to the campaign DB - i.e., persistent storage chests or dropped items. - Track objects across multiple game instances (in trusted scenarios). 
Currently, the following objects can carry UUIDs: 
Items, Creatures, Placeables, Triggers, Doors, Waypoints, Stores, Encounters, Areas. 
Will return "" (empty string) when the given object cannot carry a UUID. 
### Remarks
UUIDs can uniquely mark any object beyond a server restart. This is generally used for persistent things such as serialized objects and player inventory items but can be anything such as finding a unique instance of a particular NPC which would otherwise be impossible due to exactly the same tag and resref as dozens of others. 
Note that objects may not have a UUID until GetObjectUUID is called on the object. To guarantee that ObjectToJson will serialize with the UUID property, call GetObjectUUID on the object first. 
### Version
This function was added in 1.74.8188 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | ForceRefreshObjectUUID, GetObjectByUUID, GetRandomUUID
