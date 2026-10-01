<!-- Source: https://nwnlexicon.com/index.php/CheckPartyForItem -->

# CheckPartyForItem(object, string)
Check party for possession of an item. 
int CheckPartyForItem( object oMember, string sItem);

### Parameters 

oMember
    Member of party to be checked. 

sItem
    Tag of item to be checked for.
### Description
Checks faction of oMember for the item defined by the tag sItem. Returns TRUE if anyone in oMember's faction possesses sItem. Returns FALSE if no one in oMember's faction possesses sItem. 
### Requirements
#include "nw_i0_tool" 
### Version
1.22 
### Example
// Attached to OnClick event of a trigger. Sends clicker to the destination// defined by waypoint WP_Destination if any party member possesses the key with// tag "TravelKey". Otherwise, displays message indicating that the party does// not have the key.#include "nw_i0_tool"void main(){ object oClicker = GetClickingObject(); object oTarget = GetWaypointByTag("WP_Destination"); if (CheckPartyForItem(oClicker, "TravelKey")) JumpToObject(oTarget); else SpeakString("Your party does not have the correct key.");}
### See Also
functions:  | GetIsItemPossessedByParty
