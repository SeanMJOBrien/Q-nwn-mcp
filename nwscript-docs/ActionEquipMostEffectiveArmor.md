<!-- Source: https://nwnlexicon.com/index.php/ActionEquipMostEffectiveArmor -->

# ActionEquipMostEffectiveArmor()

Causes the calling creature to equip the best armor in its inventory. 
void ActionEquipMostEffectiveArmor();

### Description
The calling creature will equip the armor in its possession that has the highest armor class. Remember, a creature cannot change its armor while in combat. 
### Remarks
As with all ActionEquip* functions, it is not necessary to first unequip the current item in the same inventory slot before equipping the new item. 
Also note that Clothing as it is not considered "armor" _per se_. Only padded armor or better (even with AC decreases) will get equipped. See the second example code for how to equip the first armor found, for a simple example of how to equip clothing. 
### Known Bugs
Not really a bug, but intended, as noted above: any clothing (still "armor") is not equipped, even if it has a positive AC bonus. Because the base AC is 0, it is not considered proper armor by this function. 
### Version
1.62 
### Example
// Example 1// When, in a conversation, the PC orders us to "Prepare for battle", we equip// our best armor (we should have some armor in our inventory, and be wearing// something worse (eg: clothes) currently). We also equip the biggest, bestest// ranged weapon or, lacking that, melee weapon we have.void main(){ // Stop what we are doing, do the equipping ClearAllActions(); SpeakString("Um, I'm now ready, you know...to fight..."); ActionEquipMostDamagingRanged(); ActionEquipMostEffectiveArmor();}// Example 2// This method does not use ActionEquipMostEffectiveArmor() and is a workaround// to allow equipping clothing. It will equip any armor in the entering object's// inventory. It can easily be modified to be used on a NPC's spawn script, but// this is a good thing to have on a trigger around the module spawn point for// PCs. Thanks to georage.void main(){ // Get the entering object object oPC = GetEnteringObject(); string sLocal = "DO_ONCE" + ObjectToString(OBJECT_SELF); // Only do this once, and only to PCs if(GetLocalInt(oPC, sLocal) || (oPC)) return; // Set to not do it again SetLocalInt(oPC, sLocal, TRUE); // Loop the object's inventory and equip the first object oItem = GetFirstItemInInventory(oPC); while(GetIsObjectValid(oItem)) { // Check if armor, of course if(GetBaseItemType(oItem) == BASE_ITEM_ARMOR) { // Equip it and stop the script AssignCommand(oPC, ActionEquipItem(oItem, INVENTORY_SLOT_CHEST)); return; } oItem = GetNextItemInInventory(oPC); }}
### See Also
functions:  | GetItemACValue
