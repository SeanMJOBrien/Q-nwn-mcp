<!-- Source: https://nwnlexicon.com/index.php/GetArea -->

# GetArea

# GetArea(object)
Returns the area oTarget is currently in. 
object GetArea( object oTarget);
#### Parameters
_oTarget_
The area that the target is located. 
#### Description
Returns the area that oTarget is currently in where oTarget can be a PC, creature, placeable, or item. Returns OBJECT_INVALID on any error. 
#### Remarks
If the area for a known creature is invalid, it is probably in limbo! Doing anything to it when it is in limbo may well crash the game (especially DelayCommanded actions). If a PC's area is invalid, it can only be in an area transition - almost like Limbo - and may also cause a crash if their action queue is edited, or so on. If called on an area, it returns the area itself. So, if OBJECT_SELF is an area, (GetArea(OBJECT_SELF)==OBJECT_SELF) 
If called on an item that is not in an inventory (e.g. sitting on the ground), it will return the area the item is in. To determine the area of an item in an inventory (e.g. a placeable with an inventory or a creature's inventory), use GetArea on the item's possessor, e.g. GetArea(GetItemPossessor(oItem)). This also works if the item is in a container within a creature or placeable's inventory. 
#### Version
1.62 
#### Example
// Get the are of the script caller. If this is an area or module, // it will obviously be invalid main(){ // Define the oArea object variable. object oArea; // Get the area of the script caller. oArea = GetArea(OBJECT_SELF);}
#### See Also
functions:  |   GetAreaFromLocation
