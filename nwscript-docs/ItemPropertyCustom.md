<!-- Source: https://nwnlexicon.com/index.php?title=ItemPropertyCustom&amp;action=history -->

# ItemPropertyCustom(int, int, int, int)

Constructs an item property given explicit parameters. 
itemproperty ItemPropertyCustom( int nType, int nSubType=-1, int nCostTableValue=-1, int nParam1Value=-1);
#### Parameters 

nType
    The item property main type; usually a ITEM_PROPERTY_* constant (itempropsdef.2da line reference) 

nSubType
    The item subtype, if applicable. See specific item property constructor functions for the values to use. (default -1, ie; unused/not applicable). 

nCostTableValue
    The item cost table value, if applicable. See specific item property constructor functions for the values to use. (default -1, ie; unused/not applicable). 

nParam1Value
    The item parameter 1 value, if applicable. See specific item property constructor functions for the values to use. (default -1, ie; unused/not applicable).
#### Description
Constructs a custom itemproperty given all the parameters explicitly. 
This function can be used in place of all the other ItemPropertyXxx constructors 
Use GetItemPropertyType, GetItemPropertySubType, GetItemPropertyCostTableValue, GetItemPropertyParam1Value to see the values for a given itemproperty. 
Returns an invalid item property if necessary parameters are not provided. 
#### Remarks
The function Bioware should have made instead of 50+ ItemPropertyXxx functions. This allows constructed item properties from integers, copying item properties much more easily from item to item and storing them into databases or locals for replication later. 
You can test if an item property you've created using this function is valid with GetIsItemPropertyValid. This function has less "safety" since it requires you to know what values are valid when creating item properties so take some care using it. 
This also can work with _new_ item properties - ie new lines in itempropsdef.2da and related 2das. These won't "do" anything in the engine itself, but will be good for players to see the properties in the description of the item, and it provides good options for scripting. For instance you could add a property "Reagent" which can very easily classify different flowers or consumables as being able to provide a particular spell component rather than having long lists of tags that are valid (eg: "Reagent: Cure Wounds Potion Component"). 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed ItemPropertyCustom() returning a valid itemproperty if a required parameter was -1. 
#### Example
// Adds a temporary +5 AC bonus to the users equipped armorvoid main(){ object oUser = GetLastUsedBy(); object oArmor = GetItemInSlot(INVENTORY_SLOT_CHEST, oUser); // If not valid or already has an AC bonus stop if((oArmor) || GetItemHasItemProperty(oArmor, ITEM_PROPERTY_AC_BONUS)) return; // Construct item property // - AC // - No subtype // - 5 bonus as the Cost Table Value itemproperty ipAC = ItemPropertyCustom(ITEM_PROPERTY_AC_BONUS, -1, 5); // Apply the item property if valid for 300 seconds (5 minutes) if(GetIsItemPropertyValid(ipAC)) { AddItemProperty(DURATION_TYPE_TEMPORARY, ipAC, oArmor, 300.0); }}
#### See Also
functions:  |  Item Creation Functions  

constants:  |  A lot of them - see remarks.
