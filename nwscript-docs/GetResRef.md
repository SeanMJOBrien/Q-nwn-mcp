<!-- Source: https://nwnlexicon.com/index.php?title=GetResRef&amp;action=history -->

# GetResRef(object)
Returns the ResRef of an object. 
string GetResRef( object oObject);
#### Parameters 

oObject
    Object to return the ResRef of.
#### Description
Returns the ResRef (resource reference) of oObject. The ResRef is what identifies an object on the palette, since it refers to the name of the file that contains the info about the object on the palette. For instance, you must use the ResRef, not tag, when creating objects. Thus, you can use GetResRef to create a given object afresh with CreateObject. If you want the given object copied more precisely (eg with damage etc.) use CopyObject instead. 
Note that resref fields may be intentionally blank (note the module itself has no resref, nor do player objects), or can be blank in other ways (such as using Json to edit the field). Returns an empty string ("") on error. 
The string will always be lowercase, as per the standard enforced by the toolset. 
#### Remarks
Since a patch some time ago, this function will now also return the ResRef of items that have been brought in from other modules, and thus don't exist in the current module. This can be done because the ResRef is actually stored in the item's properties. However, you of course won't be able to do a CreateObject with the obtained ResRef, but the same result can be obtained with CopyItem and CopyObject. 
Players have null resrefs, and are thusly blank strings, "", as are any PC objects tag. 
Function returns "nw_X" where X je number for instances areas (eg via. CreateArea). This was changed in some update as originally it returned the resref of the area. So if you are checking area resref in any script inside instance, try GetTag instead or mark the area with local integer as this won't work anymore. 
#### Known Bugs
In game, if a stacked item is split, only one of the new stacks will have a resref - the resref for the other stack will be an empty string. Also, restacking them will keep the ResRef of the stack being added into, so it is very possible to end up with items without ResRefs when dealing with stackable items. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. GetResRef() now works with encounter objects. 
#### Example
// Put this OnDeath of a creature to respawn it at the// waypoint tagged "wp_respawn". Note that the creature on// the palette must be identical to the creature dying, as// the respawning creature is actually a new creature from the// palette. Lilac Soul.void main(){ string sRes=GetResRef(OBJECT_SELF); object oTarget=GetWaypointByTag("wp_respawn"); location lLoc=GetLocation(oTarget); CreateObject(OBJECT_TYPE_CREATURE, sRes, lLoc);}// An all round script for a useful use for GetResRef, provided// by Windbourne. Place or add into a creatures On Death event,// and as long as the "SpawnMeHere" variable is set to a tag of// a waypoint or any other object which you want it to respawn// at, it will do forever (EG: A rat at a sewer grate continually // respawning)void main(){ // Get the place to respawn at string sSpawnMe = GetLocalString(OBJECT_SELF, "SpawnMeHere"); // Get creature to respawn (a copy of myself!) string sRes=GetResRef(OBJECT_SELF); // Get where to create the new creature object oTarget=GetObjectByTag(sSpawnMe); location lLoc=GetLocation(oTarget); // Create the new creature. This should happen forever! CreateObject(OBJECT_TYPE_CREATURE, sRes, lLoc);}
#### See Also  
---
