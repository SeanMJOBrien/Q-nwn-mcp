<!-- Source: https://nwnlexicon.com/index.php?title=GetTargetingModeSelectedObject&amp;action=history -->

# GetTargetingModeSelectedObject()

Gets the target object in the module OnPlayerTarget event. 
object GetTargetingModeSelectedObject();
### Description
Returns an object reference to a targeted object, or OBJECT_INVALID if the player has exited targeting mode. 
If targeting OBJECT_TYPE_TILE (ie the ground), the area object is returned. Use GetTargetingModeSelectedPosition to get the position chosen. 
### Remarks
Be somewhat careful when exiting the mode is detected, the area the player is in may be invalid (in a transition) and it is worth making no assumptions they are able to do anything immediately. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | EnterTargetingMode() GetTargetingModeSelectedPosition() GetLastPlayerToSelectTarget()
