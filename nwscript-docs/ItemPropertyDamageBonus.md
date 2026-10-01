<!-- Source: https://nwnlexicon.com/index.php/ItemPropertyDamageBonus -->

# ItemPropertyDamageBonus(int, int)
Sets a damage bonus itemproperty. 
itemproperty ItemPropertyDamageBonus( int nDamageType, int nDamage);
#### Parameters 

nDamageType
     IP_CONST_DAMAGETYPE_*  or line in iprp_damagetype.2da (custom damage types can now be added) 

nDamage
     IP_CONST_DAMAGEBONUS_*  or line in iprp_damagecost.2da
#### Description
Sets item property Damage bonus. You must specify the damage type constant (IP_CONST_DAMAGETYPE_*) and the amount of damage constant (IP_CONST_DAMAGEBONUS_*). 
Damage bonus effects on a weapon only ever applies the highest ranked one using the Rank column in iprp_damagecost.2da for the same damage type. Having +1d6 fire damage and +10 fire damage only applies the latter (rank 5 versus rank 18). 
NOTE: The damage types IP_CONST_DAMAGETYPE_PHYSICAL and IP_CONST_DAMAGETYPE_SUBDUAL have no effect and are legacy dummy values that shouldn't be used. 
#### Remarks
The itemproperty commands are special constructors - they construct an itemproperty "object" which can then be applied to an item using the AddItemProperty command, much like effects need to be first constructed, then applied with ApplyEffectToObject. 
It will often be a good idea to remove similar itemproperties from the item first. There's a command in the "x2_inc_itemprop" include file called IPSafeAddItemProperty which will do that for you. Check IPSafeAddItemProperty for current bug report. 
The IP_CONST_DAMAGETYPE_* constant can be retrieved off this type of item property using GetItemPropertySubType. The IP_CONST_DAMAGEBONUS_* constant can be retrieved using GetItemPropertCostTableValue"). 
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. Custom damage types can now be added. 
#### Example
//The include is for the IPSafeAddItemProperty function#include "x2_inc_itemprop" //Makes the PC speaker's onhand weapon deal 1d10 additional acid damagevoid main(){ object oPC=GetPCSpeaker(); object oItem = GetItemInSlot(INVENTORY_SLOT_RIGHTHAND, oPC); int nDamageType = IP_CONST_DAMAGETYPE_ACID; int nDamage = IP_CONST_DAMAGEBONUS_1d10; if ((oItem)) return; //stop if no weapon itemproperty ipAdd = ItemPropertyDamageBonus(nDamageType, nDamage); IPSafeAddItemProperty(oItem, ipAdd);}
#### See Also
constants:  |   IP_CONST_DAMAGETYPE_* Constants   IP_CONST_DAMAGEBONUS_* Constants
