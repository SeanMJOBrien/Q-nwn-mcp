<!-- Source: https://nwnlexicon.com/index.php/SetObjectUiDiscoveryMask -->

# SetObjectUiDiscoveryMask(object, int)

Sets the discoverability mask on oObject. 
void SetObjectUiDiscoveryMask( object oObject, int nMask = OBJECT_UI_DISCOVERY_DEFAULT);
#### Parameters 

oObject
    The object to apply the discovery mask to. 

nMask
    The discovery mask to apply to oObject. nMask is a bitmask of  OBJECT_UI_DISCOVERY_*
#### Description
Sets the discoverability mask on oObject. 
This allows toggling areahilite (TAB key by default) and mouseover discovery in the area view. 
Will currently only work on Creatures, Doors (Hilite only), Items and Useable Placeables. 
Does not affect inventory items. 
#### Remarks
This allows dynamically hiding objects from discovery which can allow clients to customise their view of objects on screen with TAB being pressed. 
You could say, automatically hide placeables which have no lootable items left, so only objects which can be looted pop up. 
If you're really mean you can also have it be used to hide items or objects so that only mouse over works on them. Please don't do this though. NWN isn't made to be a hunt-the-pixel game. 
Use SetObjectMouseCursor to disable the usual mouseover icons that might confuse players if they are on an otherwise discoverable object. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetObjectUiDiscoveryMask() while holding TAB not taking effect until release. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetObjectUiDiscoveryMask() description in nwscript.nss. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  OBJECT_UI_DISCOVERY_MODE_* Constants   

functions:  | GetObjectUiDiscoveryMask() SetObjectMouseCursor
