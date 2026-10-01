<!-- Source: https://nwnlexicon.com/index.php/TagItemProperty -->

# TagItemProperty(itemproperty, string)

Tags the item property with the provided string. 
itemproperty TagItemProperty( itemproperty nProperty, string sNewTag);

### Parameters 

nProperty
    The item property to set the tag on. 

sNewTag
    A string to tag the item property with.
### Description
Tags the item property with the provided string. Any tags currently set on the item property will be overwritten. 
### Remarks
The itemproperty commands are special constructors - they construct an itemproperty "object" which can then be applied to an item using the AddItemProperty command, much like effects need to be first constructed, then applied with ApplyEffectToObject.This does not tag the itemproperty passed in, but generates a new itemproperty-with-tag which must be assigned to a variable or added. Only the newest tag will persist for any itemproperty. This is used in conjuction with GetItemPropertyTag to uniquely identify an itemproperty, such as to remove itemproperties created by a specific interaction (see example below). 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
#include "x2_inc_itemprop"//The include is for the IPSafeAddItemProperty function //Makes the PC speaker's belt a belt of +10 of an Ability chosen by PC's first class.void main(){ object oPC=GetPCSpeaker(); object oBelt=GetItemInSlot(INVENTORY_SLOT_BELT, oPC); if ((oBelt)) return; int iClass=GetClassByPosition(1, oPC); itemproperty ipAddStat; switch(iClass) { case CLASS_TYPE_FIGHTER: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_STR, 10); break; case CLASS_TYPE_ROGUE: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_DEX, 10); break; case CLASS_TYPE_WIZARD: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_INT, 10); break; // etc for each class. default: ipAddStat=ItemPropertyAbilityBonus(IP_CONST_ABILITY_CON, 10); break; } // Regardless of which Ability was chosen, it can be identified by the following tag ipAddStat=TagItemProperty(ipAddStat, "Giants_Alter"); IPSafeAddItemProperty(oBelt, ipAddStat);}//The above tag can be retrieved to test if the PC is still using the same beltint IsBeltGiantsAlterEnchanted(object oPC){ object oBelt=GetItemInSlot(INVENTORY_SLOT_BELT, oPC); itemproperty ipLoop=GetFirstItemProperty(oBelt); while(GetIsItemPropertyValid(ipLoop)) { if(GetItemPropertyTag(ipLoop) == "Giants_Alter") return TRUE; ipLoop=GetNextItemProperty(oBelt); } return FALSE;}
### See Also
functions:  | GetItemPropertyTag()
