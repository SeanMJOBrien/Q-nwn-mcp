<!-- Source: https://nwnlexicon.com/index.php/GetInventoryDisturbItem -->

# GetInventoryDisturbItem

# GetInventoryDisturbItem()
Returns the disturbing item in an inventory OnDisturbed event. 
object GetInventoryDisturbItem();
#### Description
Returns the item that caused the object's OnDisturbed event to fire. There are three events that will cause this event to fire; when an item is added to, taken from, or stolen from inventory. 
Returns OBJECT_INVALID on error, which will never happen if this function is used exclusively in OnDisturbed events of objects with inventories. (At least in theory - check the bug list below) 
#### Known Bugs
It has been previously noted that the event OnDisturbed does not fire when the item being disturbed is gold. There's still something odd going on with that function. I made this little script and put OnDisturbed of a container: 
void main(){ object oPC = GetLastDisturbed(); object oDisturb = GetInventoryDisturbItem(); SendMessageToPC(oPC, "this: " + GetName(oDisturb));}
When I put gold into the container, I get a message telling me "this: Gold piece". So it does fire for gold. When I take it back from the container, I get the message "this:". I tested it, and when removing gold from a container, GetInventoryDisturbItem() returns OBJECT_INVALID. 
Also, there's a bug with stackable items. If a stackable item is added to another stack in either the giver's or receiver's inventory, the OnDisturbed event never fires (except for gold pieces, apparently). 
#### Version
1.30 
#### Example
// put this OnDisturbed of a container. Whenever anybody// removes an item from the container, they'll be charged// that item's value for it... Lilac Soulvoid main(){ object oItem = GetInventoryDisturbItem(); object oPC = GetLastDisturbed(); int nType = GetInventoryDisturbType(); switch (nType) { case INVENTORY_DISTURB_TYPE_REMOVED: case INVENTORY_DISTURB_TYPE_STOLEN: int nAmount = GetGoldPieceValue(oItem); AssignCommand(oPC, TakeGoldFromCreature(nAmount, oPC, TRUE)); SendMessageToPC(oPC, "Stealing is wrong. Give me your money!"); break; }}
#### See Also
functions:  |  GetLastDisturbed  

events:  |  OnDisturbed Event
