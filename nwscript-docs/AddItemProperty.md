<!-- Source: https://nwnlexicon.com/index.php/AddItemProperty -->

# AddItemProperty(int, itemproperty, object, float)
Add an itemproperty to an item. 
void AddItemProperty( int nDurationType, itemproperty ipProperty, object oItem, float fDuration = 0.0f);
### Parameters 

nDurationType
    A DURATION_TYPE_* constant. 

ipProperty
    Itemproperty to add. 

oItem
    Item to add the property to. 

fDuration
    Duration (if added temporarily). (Default: 0.0f)
### Description
Adds an itemproperty to the specified item. Only temporary and permanent duration types are allowed. 
An item can have a maximum of 254 properties. Unlike the toolset there are less restrictions (eg: you can add more than 8 ItemPropertyCastSpell ones that can be cast) 
### Remarks
The itemproperty must first be created using one of the many ItemProperty functions. In this respect, it works much like effects, which must first be created, then applied. 
It will often be a good idea to remove similar itemproperties from the item first (reason being is they might not work well together, only the first being used or whatever). There's a command in the x2_inc_itemprop include file called IPSafeAddItemProperty() which will do that for you. 
### Version
1.61 
### Example
// Have the NPC upgrade the PC speaker's helmet to a Helmet of Undead Turningvoid main(){ object oPC = GetPCSpeaker(); object oHelmet = GetItemInSlot(INVENTORY_SLOT_HEAD, oPC); if ((oHelmet)) return; itemproperty ipAddFeat = ItemPropertyBonusFeat(IP_CONST_FEAT_KNOCKDOWN); AddItemProperty(DURATION_TYPE_PERMANENT, ipAddFeat, oHelmet);}
### See Also
functions:  | IPSafeAddItemProperty  

constants:  | DURATION_TYPE_* Constants
