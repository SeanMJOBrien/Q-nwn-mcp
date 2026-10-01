<!-- Source: https://nwnlexicon.com/index.php?title=GetObjectByTag&amp;action=history -->

# GetObjectByTag(string, int)
Retrieves an object based on the tag given to it. 
object GetObjectByTag( string sTag, int nNth = 0);
#### Parameters 

sTag
    The tag of the object to search for. 

nNth
    The Nth object with this tag may be requested. This is a 0 indexed reference, meaning the first item will be nNth = 0 (Default: 0)
#### Description
Returns the nNth object of the specified tag or OBJECT_INVALID if the object cannot be found. Tags are case sensitive. 
sString cannot be "", this will return OBJECT_INVALID. 
Note players by default have no tag, but you can use SetTag on them to be added to the tagged object list. 
#### Remarks
As at NWN:EE patch 8193.33, this returns the last created object with sTag first (when nNth = 0) and scans objects in reverse-created order from there. 
_The remaining remarks below were originally made, and may have been correct for, an earlier version of the game:_
The nNth parameter has been determined to return the nNth object with the specified sTag starting at position 0. Outside of the current area, the scan will begin starting with the last (most recent) area added to the module following this hierarchy: 
  * OBJECT_TYPE_STORE (128)
  * OBJECT_TYPE_PLACEABLE (64)
  * OBJECT_TYPE_WAYPOINT (32)
  * OBJECT_TYPE_AREA_OF_EFFECT (16) (spell effects, like web)
  * OBJECT_TYPE_DOOR (8)
  * OBJECT_TYPE_TRIGGER (4)
  * OBJECT_TYPE_ITEM (2)
  * OBJECT_TYPE_CREATURE (1)

GetObjectByTag can also be used to get areas although the return heirarchy in the above list is unknown. You cannot tag the module, so to get the module use GetModule instead. 
#### Efficiency
This function is in most cases more efficient and faster than GetWaypointByTag or GetNearestObjectByTag functions. This is because it uses a binary search tree to speed up search, rather than iterating over all objects until a match is found. Use unique tags and GetObjectByTag for best results. This might be a concern in a large modules with 10k+ objects. 
#### Version
1.64: The feature of "" returning player characters (IE: Those objects without a tag) has been fixed or changed in 1.64, and now properly returns OBJECT_INVALID. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed PCs not being searchable with GetObjectByTag() after relogging. 
#### Example
// Demonstrates how to retrieve an object with the GetObjectByTag() function and apply a spell effect to it.void main(){ //makes the world appear dark to NPC Bob ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectDarkness(), GetObjectByTag("NPC_BOB"));}
#### See Also
functions:  |  GetTag SetTag GetWaypointByTag GetNearestObjectByTag
