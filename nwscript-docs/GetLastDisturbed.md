<!-- Source: https://nwnlexicon.com/index.php?title=GetLastDisturbed&amp;action=history -->

# GetLastDisturbed

# GetLastDisturbed()
Determine who last disturbed the inventory of an object or creature. 
object GetLastDisturbed();
#### Description
Returns the last object to disturb the inventory of an object or creature. Returns OBJECT_INVALID if the inventory is undisturbed or if the object has no inventory. 
In this function, the inventory is considered "disturbed" the moment its contents are changed by either removing or adding an item. Simply examining the inventory's contents does not cause a disturbance. Additionally, it does not wait until the inventory is closed; as soon as something is added or taken away, GetLastDisturbed() will return the player or creature responsible. 
#### Remarks
This function must be called from an event script owned by the object whose inventory is being tested. 
#### Known Bugs
It has been previously noted that the event OnDisturbed does not fire when the item being disturbed is gold. However, it appears to function differently.I made this little script and put OnDisturbed of a container: 
void main(){ object oPC = GetLastDisturbed(); object oDisturb = GetInventoryDisturbItem(); SendMessageToPC(oPC, "this: " + GetName(oDisturb));}
When I put gold into the container, I get a message telling me "this: Gold piece". So it does fire for gold. When I take it back from the container, I get the message "this:". I tested it, and when removing gold from a container, GetInventoryDisturbItem() returns OBJECT_INVALID. In summary, when adding gold to a container, the event does fire, but when removing it, the event does not. 
Also, there is a bug related to stackable items. If a stackable item is added to another stack in either the giver's or receiver's inventory, the OnDisturbed event never fires, except for gold pieces. 
#### Version
1.30 
#### See Also
functions:  |  GetLastOpenedBy  

events:  |  OnDisturbed Event
