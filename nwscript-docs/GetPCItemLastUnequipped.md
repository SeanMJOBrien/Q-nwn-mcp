<!-- Source: https://nwnlexicon.com/index.php/GetPCItemLastUnequipped -->

# GetPCItemLastUnequipped

# GetPCItemLastUnequipped()
Returns the last unequipped item 
object GetPCItemLastUnequipped();
#### Description
Use this to get the item last unequipped by a player character in OnPlayerUnEquipItem.. 
#### Version
1.61 
#### Example
//PC can't take off this amulet. Ever *evil grin*void main(){object oPC=GetPCItemLastUnequippedBy();object oItem=GetPCItemLastUnequipped();if (GetTag(oItem)=="cursed_amulet") { AssignCommand(oPC, ActionEquipItem(oItem, INVENTORY_SLOT_NECK)); }}
#### See Also
functions:  |   GetPCItemLastUnequippedBy   

events:  |   OnPlayerUnEquipItem Event
