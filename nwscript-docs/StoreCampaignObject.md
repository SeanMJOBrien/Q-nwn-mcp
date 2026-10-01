<!-- Source: https://nwnlexicon.com/index.php?title=StoreCampaignObject&amp;action=history -->

# StoreCampaignObject(string, string, object, object)
Stores an object in the campaign database. 
int StoreCampaignObject( string sCampaignName, string sVarName, object oObject, object oPlayer = OBJECT_INVALID, int bSaveObjectState = FALSE);
#### Parameters 

sCampaignName
    Campaign name (case-sensitive) 

sVarName
    Unique variable name. 

oObject
    Object value to store 

oPlayer
    Player to associate this object value with. (Default: OBJECT_INVALID) 

bSaveObjectState
    If bCopyLocalState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are copied over. (Default: FALSE)
#### Description
Stores Creatures, Items, Placeables, Waypoints, Stores, Doors, Triggers or Areas (CAF format) in the campaign database. Campaign names are case-sensitive. 
Returns 1 if successful, 0 if the function fails. 
If it is a creature, all inventory items and local variables are also stored (and are retrieved when recalled) and so this function can be very CPU intensive if used often. 
#### Remarks
In NWN:EE you can now use SqlPrepareQueryCampaign combined with SqlBindObject which is essentially how this works with SQLite. 
As of HotU/1.62, local variables are stored in the database - including any on items possessed if the object stored is a creature. 
#### Version
This function was updated in 1.85.8193.31 of NWN:EE. Added Area (CAF format) as a supported type and bSaveObjectState parameter. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed the encounter object support in ObjectToJson(), CopyObject(), SqlBindObject(), StoreCampaignObject(). 
#### See Also
functions:  |  RetrieveCampaignObject SqlBindObject
