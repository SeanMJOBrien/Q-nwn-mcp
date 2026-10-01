<!-- Source: https://nwnlexicon.com/index.php?title=ActionUseItemAtLocation&amp;action=history -->

# ActionUseItemAtLocation(object, itemproperty, location, int, int)

Queue an action to use an active item property. 
void ActionUseItemAtLocation( object oItem, itemproperty ip, location lTarget, int nSubPropertyIndex = 0, int bDecrementCharges = TRUE);
### Parameters 

oItem
    item that has the item property to use. 

ip
    The item property to use. 

lTarget
    A target location. 

nSubPropertyIndex
    Specifies if the itemproperty has subproperties (such as subradial spells). 

bDecrementCharges
    Decrement charges if item property is limited.
### Description
Queue an action to use an active item property at a target location. 
### Remarks
This removes the need to use talent functions to use items. The item must be in the creatures possession (until the action has fired). 
This requires you first to iterate an item to get a valid property; see example for what this may look like. The item property can be any usable one, for instance traps in a creatures inventory have a usable item property that allows them to be placed. Of course the creature must fulfil the requirements of the given item to use it, eg; skill amounts. Examples of usable properties: 
  * Spell casting items, eg; Scroll of Magic Missile (property, "Cast Spell: Magic Missile (3) (Single Use)")
  * Traps, eg: Minor Spike Trap Kit (property: "Trap: Minor [Spike]")
  * Healers Kits, eg: Healer's Kit +1 (property: "Healer's Kit +1")
  * Thieves Tools, eg: Thieves' Tools +1 (property: "Theives' Tools [+1]")

Some of these, such as healers kits and thieves tools, can be passed into ActionUseSkill already; the others cannot however. 
A valid spell casting item needs valid charges, so you may want to use GetItemPropertyUsesPerDayRemaining to check that it has uses, and if it uses charges check there are enough remaining with GetItemCharges. 
Bypassing the charges with bDecrementCharges would be useful to have items remain at full charge when granted as a loot, but still used by the NPC in question in battle. If used on PCs it'd be cheating. 
_Note:_ NPCs can use unidentified items, it is not necessary to identify them in advance. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// This will try and use the item "Fire Grenade" in the OBJECT_SELF's inventory at the nearest targets location// Try running it on a creatures heartbeat, who has the item in their inventory, while standing nearby.void main(){ object oTarget = GetNearestObject(OBJECT_TYPE_CREATURE); location lTarget = GetLocation(oTarget); int nSpellID = SPELL_GRENADE_FIRE; itemproperty ip; int nItemSpell; int nSubtype; int nStop = FALSE; object oItem = GetFirstItemInInventory(); while(GetIsObjectValid(oItem) && nStop == FALSE) { ip = GetFirstItemProperty(oItem); while(GetIsItemPropertyValid(ip) && nStop == FALSE) { if(GetItemPropertyType(ip) == ITEM_PROPERTY_CAST_SPELL) { // This returns an ID from iprp_spells - ie; it is a spell, but the level / spell ID is codified in another 2DA. So look it up. nSubtype = GetItemPropertySubType(ip); nItemSpell = StringToInt(Get2DAString("iprp_spells","SpellIndex",nSubtype)); // Checking spell property Debug SpeakString("Checking spell ID: " + IntToString(nSpellID) + " called: " + Get2DAString("iprp_spells","Label",nSubtype) + " on item: " + GetName(oItem) + " checking: " + IntToString(nItemSpell)); if(nItemSpell == nSpellID) { // Debug SpeakString("Found spell ID and trying to use: " + IntToString(nSpellID) + " called: " + Get2DAString("iprp_spells","Label",nSubtype) + " on item: " + GetName(oItem) + " firing against target: "+ GetName(oTarget)); ClearAllActions(); ActionUseItemAtLocation(oItem, ip, lTarget); ActionSpeakString("I should have used an item"); nStop = TRUE; } } ip = GetNextItemProperty(oItem); } oItem = GetNextItemInInventory(); }}
### See Also
functions:  | SetItemPropertyUsesPerDayRemaining() SetItemPropertyUsesPerDayRemaining() ActionUseItemOnObject()
