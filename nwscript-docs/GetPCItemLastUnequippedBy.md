<!-- Source: https://nwnlexicon.com/index.php/GetPCItemLastUnequippedBy -->

# GetPCItemLastUnequippedBy

# GetPCItemLastUnequippedBy()
Get the PC who last unequipped an item 
object GetPCItemLastUnequippedBy();
#### Description
Use this to get the player character who last unequipped an item in OnPlayerUnEquipItem.. 
#### Remarks
Can be used to make cursed items truly cursed, in the sense that they can't even be unequipped. 
#### Version
1.61 
#### Example
//PC can't take off this amulet. Ever *evil grin*void main(){object oPC=GetPCItemLastUnequippedBy();object oItem=GetPCItemLastUnequipped();if (GetTag(oItem)=="cursed_amulet") { AssignCommand(oPC, ActionEquipItem(oItem, INVENTORY_SLOT_NECK)); }}
#### See Also
functions:  |   GetPCItemLastUnequipped   

events:  |   OnPlayerUnEquipItem Event
