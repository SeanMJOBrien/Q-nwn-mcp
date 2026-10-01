<!-- Source: https://nwnlexicon.com/index.php/ActionInteractObject -->

# ActionInteractObject(object)
Causes a creature or PC to use an object. 
void ActionInteractObject( object oPlaceable);
#### Parameters 

oPlaceable
    Placeable object to interact with.
#### Description
Causes the calling creature to interact with a placeable object, if that object can be interacted with. If the placeable has an inventory it opens it, else if it has an OnUsed script it will fire it. 
#### Remarks
This action gets added to the action queue. If you want to add a action on top of the action queue use DoPlaceableObjectAction with PLACEABLE_ACTION_USE. 
It appears to work fine to fire OnUsed events, for instance maybe an NPC wants to turn on or off a lamp or start a fire? Or even sit down without using ActionSit directly? Use this. 
Having not done extensive testing can an NPC even really open a placeables inventory? Not sure needs further testing! 
#### Version
1.61 
#### Example
// Gets the first PC in the module to open the created "personal chest" that appears near themvoid main(){ object oPC = GetFirstPC(); object oChest = CreateObject(OBJECT_TYPE_PLACEABLE, "personal_chest", GetLocation(oPC)) AssignCommand(oPC, ActionInteractObject(oChest));}
#### See Also
functions:  |  GetIsPlaceableObjectActionPossible, DoPlaceableObjectAction
