<!-- Source: https://nwnlexicon.com/index.php/JsonToObject -->

# JsonToObject(json, location, object, int)

Deserializes the game object described in jObject. 
object JsonToObject( json jObject, location locLocation, object oOwner = OBJECT_INVALID, int bLoadObjectState = FALSE);
### Parameters 

jObject
    object to deserialize from json. 

locLocation
    specifies the location where the object is created. 

oOwner
    object owner. If valid, for valid use cases, the object is placed in owner's inventory and locLocation is ignored. 

bLoadObjectState
    specifies whether to include more detailed info in some cases; see below.
#### Description
Deserializes the game object described in jObject. 
Returns OBJECT_INVALID on errors. 
Supported object types: creature, item, trigger, placeable, door, waypoint, encounter, store, area (combined format), soundobject. 
For areas, locLocation is ignored. 
If bLoadObjectState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are read in. 
This function is for advanced usecases that require understanding of the game's internals and how the engine loads and migrates data as the game is changed to support new features. The only guarantee given is that older data files can be loaded on newer game versions. As such, fields can become deprecated or change meaning. You need to handle this by either constructing a clean-room GFF file, or by writing migration code using the game/build version getters. 
#### Remarks
Use TemplateToJson to easily initially generate the JSON needed, else you'll be rolling your own by hand - there is no loadable JSON datatype at the moment. 
Once generated make tweaks and changes then use this function to spawn it into the world. 
This is also a way to create sound objects which are sent to the player immediately. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed traps created by nwscript not being detectable until after a save/load cycle. 
#### Example
Example will take a placeable of resref "plc_resref" (invalid - replace with your own) and alter the appearance to line ID 33, a Ballista, then spawn it. 
#include "nw_inc_gff"void main(){ // Generate JSON from resref template json jPlaceable = TemplateToJson("plc_resref", RESTYPE_UTP); // Change to appearance 390 jPlaceable = GffReplaceDword(jPlaceable, "Appearance", 33); // Spawn JsonToObject(jPlaceable, GetLocation(OBJECT_SELF));}
#### See Also
functions:  |  JSON Functions GFF Functions GffReplaceDword") ObjectToJson TemplateToJson
