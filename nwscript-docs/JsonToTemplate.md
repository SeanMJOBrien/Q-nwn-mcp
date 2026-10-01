<!-- Source: https://nwnlexicon.com/index.php?title=JsonToTemplate&amp;action=history -->

# JsonToTemplate(json, string, int)

Serializes the given JSON structure (which must be a valid template spec) into a template. 
json JsonToTemplate( json jTemplateSpec, string sResRef, int nResType);
### Parameters 

jTemplateSpec
    Json template to use as a template 

sResRef
    blueprint resref to translate into json 

nResType
    blueprint resource type constant for the blueprint
### Description
Serializes the given JSON structure (which must be a valid template spec) into a template. 
Returns TRUE if the serialization was successful. 
The template will be stored in the TEMP: alias and currently NOT stored in savegames. The stored template will override anything currently available in the module. 
Supported GFF resource types are the same as TemplateToJson(). However, some types will not be read by the game (e.g. module.IFO is only read at module load). 
Any target file in TEMP: will be overwritten, even if the serialisation is not successful. 
JsonToTemplate(JSON_NULL, ..) can be used to delete a previously-generated file. 
### Remarks
While you can use JsonToObject for many objects, in some cases this is highly useful, for instance a base Neverwinter Nights encounter trigger will use templates, as will the built in DM creator menu. It also helps harmonise templates used in existing systems you don't want to convert to JSON or ones you want to have somewhat static template objects used - it will be faster to just call CreateObject on a blueprint templated object then it is to do JsonToObject and all the inbetween JSON saving/loading/conversion/change. 
For what TEMP: can override see the content load order wiki page ("Current Game"), or the in game resman manager (at least in singleplayer). Mainly it means hakpack files cannot be overriden but module files can be - this is where most blueprint templates are stored anyway so is fine to use this to override them and base game templates. 
### Version
This function was added in 1.88.8193.36 of NWN:EE. 
### Example
Example will take a placeable of resref "plc_resref" (invalid - replace with your own) and alter the appearance to line ID 33, a Ballista, then save it back to TEMP: as plc_resref2, and then generate that object with CreateObject. 
#include "nw_inc_gff"void main(){ // Generate JSON from resref template json jPlaceable = TemplateToJson("plc_resref", RESTYPE_UTP); // Change to appearance 390 jPlaceable = GffReplaceDword(jPlaceable, "Appearance", 33); // Save to template JsonToTemplate(jPlaceable, "plc_resref2", RESTYPE_UTP); // Spawn one from the new template CreateObject(OBJECT_TYPE_PLACEABLE, "plc_resref2", GetLocation(OBJECT_SELF));}
### See Also
functions:  | ResManGetAliasFor() ResManFindPrefix() TemplateToJson()
