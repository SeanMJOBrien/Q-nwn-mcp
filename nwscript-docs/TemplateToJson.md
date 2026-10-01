<!-- Source: https://nwnlexicon.com/index.php?title=TemplateToJson&amp;action=history -->

# TemplateToJson(string, int)

Deserializes the given resref/template into a JSON structure. 
json TemplateToJson( string sResRef, int nResType);
### Parameters 

sResRef
    blueprint resref to translate into json 

nResType
    blueprint resource type constant for the blueprint
### Description
Deserializes the given resref/template into a JSON structure. 
Supported GFF resource types: 
  * RESTYPE_CAF - Combined Area format (and RESTYPE_ARE, RESTYPE_GIT, RESTYPE_GIC)
  * RESTYPE_UTC - Creature
  * RESTYPE_UTI - Item
  * RESTYPE_UTT - Trigger
  * RESTYPE_UTP - Placeable
  * RESTYPE_UTD - Door
  * RESTYPE_UTW - Waypoint
  * RESTYPE_UTE - Encounter
  * RESTYPE_UTM - Merchant (Store)
  * RESTYPE_DLG - Dialog file
  * RESTYPE_UTS - Sound template
  * RESTYPE_IFO - Module information file
  * RESTYPE_FAC - Module faction information file
  * RESTYPE_ITP - Item toolset palette
  * RESTYPE_JRL - Module journal
  * RESTYPE_GUI - GUI files
  * RESTYPE_GFF - Base GFF files

Returns a valid gff-type json structure, or a null value with JsonGetError set. 
### Remarks
The use of this function is primarily to generate JSON for JsonToObject. The best thing about it is you essentially have a dynamic blueprint editor - existing objects would need to be recreated but with this and the other JSON functions you can do essentially any changes to things before creation: 
  * Edit properties of a creature such as classes, domains, spell schools, feats, maximum HP, abilities or spells known before spawning, changes not available usually
  * Edit an items additional properties such as the Additional Cost field before spawning, again not available in the toolset
  * Change a placeables appearance and portrait before spawning in
  * Change the dimensions of a encounter or trigger with a dynamic size
  * Alter a merchant store options before spawning
  * Update an encounters monster list

The game doesn't really have any "blank" templates but these are easily generated, and then changes layered on top, although less changes are faster. 
You do need to be a little careful with major changes - the game won't spawn the objects or may spawn it with invalid properties potentially confusing the game (and you!). 
The main JSON replacement functions are available in helper functions in nw_inc_gff.nss making it trivial to do the above changes. 
### Version
This function was added in 1.85.8193.31 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. TemplateToJson() and JsonToTemplate() now also support RESTYPEs: DLG, UTS, IFO, FAC, ITP, JRL, GUI, GFF. 
### Example
Example will take a placeable of resref "plc_resref" (invalid - replace with your own) and alter the appearance to line ID 33, a Ballista, then spawn it. 
#include "nw_inc_gff"void main(){ // Generate JSON from resref template json jPlaceable = TemplateToJson("plc_resref", RESTYPE_UTP); // Change to appearance 390 jPlaceable = GffReplaceDword(jPlaceable, "Appearance", 33); // Spawn JsonToObject(jPlaceable, GetLocation(OBJECT_SELF));}
### See Also
functions:  | ResManGetAliasFor() ResManFindPrefix()
