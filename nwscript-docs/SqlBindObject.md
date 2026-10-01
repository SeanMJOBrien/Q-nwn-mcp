<!-- Source: https://nwnlexicon.com/index.php?title=SqlBindObject&amp;action=history -->

# SqlBindObject(sqlquery, string, object)

Bind an object to a named parameter of the given prepared query. 
void SqlBindObject( sqlquery sqlQuery, string sParam, object oObject, int bSaveObjectState = FALSE );
### Parameters 

sqlQuery
    An already prepared SQL query 

sParam
    Parameter referenced in sqlQuery to bind 

oObject
    Object to serialise and bind 

bSaveObjectState
    If bSaveObjectState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are saved out (except for Combined Area Format, which always has object state saved out).
### Description
Bind a object to a named parameter of the given prepared query. 
Objects are serialized, **NOT** stored as a reference! This is identical to StoreCampaignObject and all caveats of that apply to this. 
Currently supported object types: Creatures, Items, Placeables, Waypoints, Stores, Doors, Triggers, Areas (CAF format). 
Like CopyObject if oObject is a player, it will serialise a "NPC version" of them. 
To retrieve the object from the DB use SqlGetObject to create it in the world. 
### Remarks
This allows much easier inputting of variables into a pre-prepared query, removing the need for a large amount of string parsing to simply update certain variables of a query. 
You utilise this by defining the parameter to alter in the prepared query, and reference it as the sParam part. 
See SqlBindString for how you can store an object reference using ObjectToString rather than the entire object itself. 
bSaveObjectState can be used to fully copy an object "exactly", although timers on effects and the action queue may not entirely correctly repopulate with SqlGetObject. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
This function was updated in 1.85.8193.31 of NWN:EE. Added Area (CAF format) as a supported type and bSaveObjectState parameter. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed the encounter object support in ObjectToJson(), CopyObject(), SqlBindObject(), StoreCampaignObject(). 
### Example
sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myint);"); object oNPC = GetObjectByTag("NPC"); SqlBindObject(v, "@myint", oNPC); SqlStep(v);
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlBindInt SqlBindFloat SqlBindString SqlBindVector SqlGetObject
