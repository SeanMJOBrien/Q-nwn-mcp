<!-- Source: https://nwnlexicon.com/index.php?title=SetName&amp;action=history -->

# SetName(object, string)
Set the name of an object. 
void SetName( object oObject string sNewName);
### Parameters 

oObject
    The object whose name is to be changed. 

sNewName
    The new name to give oObject.
### Description
Set the name of oObject to sNewName. oObject can be a creature (including a player), placeable, item, door or area. 
### Remarks
This overrides the entire name already present on the object (it overrides both first and last name for creatures - essentially their first name becomes sNewName and surname is set to ""). Setting an object's name to "" will make the object revert back to using the name it had originally had before any SetName() calls were made on the object. 
While it works on player objects some places may still show the old name like the connect player list on a server (see Known Bugs). 
If you change an areas name it might not refresh in a DMs pallet, but it is useful to do to have comments in the toolset but not in game. If you change an area name when players are in, they should get the new name (eg; when mousing over their portrait). OnModuleLoad may not set it fast enough for the first player loading the starting area however. 
You can change the color of the text shown using StringToRGBString and other special strings. 
### Known Bugs
If used on a player the player connect list still shows the old name. 
Due to overriding the name entirely, you cannot set a forename and surname, meaning some conversation tokens will not work properly if SetName is used on a player. 
### Version
This function was updated in 1.79.8193 of NWN:EE. SetName() on areas now sends the configured language, instead of English. 
This function was updated in 1.87.8193.35 of NWN:EE. SetName() now works for player characters. 
### Example
// Tag-based script for an intelligent weapon. When the weapon is activated,// this will create a generic invisible object for the PC to talk to, but will// rename it to match the weapon that triggered the event.#include "x2_inc_switches" void main(){ // Make sure this is the OnAtivateItem event if (GetUserDefinedItemEventNumber() != X2_ITEM_EVENT_ACTIVATE) return; object oPC = GetItemActivator(); // The player character using the item object oItem = GetItemActivated(); // The item being used object oInvis = CreateObject(OBJECT_TYPE_PLACEABLE, "x2_plc_intwp", GetLocation(oPC)); // Set the name of the invisible object to that of the item SetName(oInvis, GetName(oItem)); // Start the conversation AssignCommand(oPC, ActionStartConversation(oInvis, GetTag(oItem)));}
### See Also
functions:  | GetName
