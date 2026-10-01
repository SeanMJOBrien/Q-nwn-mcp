<!-- Source: https://nwnlexicon.com/index.php?title=SqlGetObject&amp;action=history -->

# SqlGetObject(sqlquery, int, location, object)

Retrieve a column cast as a object of the currently stepped row. 
object SqlGetObject( sqlquery sqlQuery, int nIndex, location lSpawnAt, object oInventory = OBJECT_INVALID, int bLoadObjectState = FALSE);
### Parameters 

sqlQuery
    An already prepared SQL query 

nIndex
    Index of the object to retrieve 

lSpawnAt
    Location to spawn the location at 

oInventory
    Inventory to place the object. Default: OBJECT_INVALID 

bLoadObjectState
    If bLoadObjectState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are read in. (Default: FALSE)
### Description
Retrieve a column cast as an object of the currently stepped row. 
You can call this after SqlStep() returned TRUE. 
The object will be spawned into a inventory if it is a item and the receiver has the capability to receive it, otherwise at lSpawnAt. 
Objects are serialized, **NOT** stored as a reference! 
In case of error, INVALID_OBJECT will be returned. 
In traditional fashion, nIndex starts at 0. 
### Remarks
Use this to retrieve data from a select SQL query. If you want to just store a reference to an object use a string instead, as described in SqlBindString. 
SqlBindObject can store these object types: Creatures, Items, Placeables, Waypoints, Stores, Doors, Triggers and Areas (CAF format) (similar to CopyObject). 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
This function was updated in 1.85.8193.31 of NWN:EE. Added Area (CAF format) as a supported type and bLoadObjectState parameter. 
### Example
// "Widget" is cast as a object. It's an item. object oPC = GetFirstPC(); sqlquery n = SqlPrepareQueryObject(oPC, "select widget from widgets;"); while (SqlStep(n)) { // Create item in their inventory object oItem = SqlGetObject(n, 0, GetLocation(oPC), oPC); SendMessageToPC(oPC, "Spawned widget: " + GetName(oItem)); }
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlGetInt SqlGetFloat SqlGetString SqlGetVector
