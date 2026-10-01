<!-- Source: https://nwnlexicon.com/index.php?title=GetItemPropertyTag&amp;action=history -->

# GetItemPropertyTag(itemproperty)

Returns the string tag set for the provided item property. 
string GetItemPropertyTag( itemproperty nProperty,);

### Parameters 

nProperty
    The item property to get the tag from.
### Description
Returns the string tag set for the provided item property. If no tag has been set, returns an empty string. 
### Remarks
The returned string is that which was set using TagItemProperty during itemproperty application. Useful in order to check for an itemproperty which exists from a specific source, rather than removing all itemproperties which match a type. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
#include "x2_inc_itemprop"//The include is for the IPSafeAddItemProperty function //Makes the PC speaker's belt a belt of +10 of an Ability chosen by PC's first class.void main(){ object oPC=GetPCSpeaker(); object oBelt=GetItemInSlot(INVENTORY_SLOT_BELT, oPC); if ((oBelt)) return; int iClass=GetClassByPosition(1, oPC); itemproperty ipAddStat; switch(iClass) { case CLASS_TYPE_FIGHTER: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_STR, 10); break; case CLASS_TYPE_ROGUE: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_DEX, 10); break; case CLASS_TYPE_WIZARD: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_INT, 10); break; // etc for each class. default: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_CON, 10); break; } // Regardless of which Ability was chosen, it can be identified by the following tag ipAddStat=TagItemProperty(ipAddStat, "Giants_Alter"); IPSafeAddItemProperty(oBelt, ipAddStat);}//The above tag can be retrieved to test if the PC is still using the same beltint IsBeltGiantsAlterEnchanted(object oPC){ object oBelt=GetItemInSlot(INVENTORY_SLOT_BELT, oPC); itemproperty ipLoop=GetFirstItemProperty(oBelt); while(GetIsItemPropertyValid(ipLoop)) { if(GetItemPropertyTag(ipLoop) == "Giants_Alter") return TRUE; ipLoop=GetNextItemProperty(oBelt); } return FALSE;}
### See Also
functions:  | TagItemProperty()
