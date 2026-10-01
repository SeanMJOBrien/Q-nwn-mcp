<!-- Source: https://nwnlexicon.com/index.php?title=ObjectToJson&amp;action=history -->

# ObjectToJson(object, int)

Transforms the given object into a json structure. 
json ObjectToJson( object oObject, int bSaveObjectState = FALSE);
### Parameters 

oObject
    The object to translate into json. 

bSaveObjectState
    specifies whether to include more detailed info in some cases; see below.
#### Description
Transforms the given object into a json structure. 
#### Remarks
The JSON format is compatible with what niv's nimtools produce. 
Returns the null JSON type on errors, or if oObject is not serializable, with JsonGetError filled in. 
Supported object types: creature, item, trigger, placeable, door, waypoint, encounter, store, area (combined format). 
If bSaveObjectState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are saved out (except for Combined Area Format, which always has object state saved out). This can make the Json file very large especially if there are any SetLocalJson references in use or a lot of local variables are used. 
Note that objects may not serialize with a UUID unless GetObjectUUID has been called on the object. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed the encounter object support in ObjectToJson(), CopyObject(), SqlBindObject(), StoreCampaignObject(). 
#### Example
// OnEnter script for an encounter, which reports a JSON serialization error with the encounter. Since // ObjectToJson() does not work on encounters (see Known Issues below), try working around this with // TemplateToJson(), instead. //void main(){ object oPC = GetEnteringObject(); if( ( oPC ) ) return; json jEnc = ObjectToJson( OBJECT_SELF ); string sErr = JsonGetError( jEnc ); string sDump = JsonDump( jEnc, 4 ); SendMessageToPC( oPC, sDump ); SendMessageToPC( oPC, sErr );}
#### See Also
functions:  |  JSON Functions
