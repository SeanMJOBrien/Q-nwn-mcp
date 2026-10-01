<!-- Source: https://nwnlexicon.com/index.php?title=GetLastPlayerToSelectTarget&amp;action=history -->

# GetLastPlayerToSelectTarget()

Gets the player object that triggered the OnPlayerTarget event. 
object GetLastPlayerToSelectTarget();
### Description
Gets the player object that triggered the OnPlayerTarget event. 
### Remarks
The player _should_ be in a valid area, unless they managed to jump to another area thus cancelling the event in progress, so be careful in those cases doing anything to the player in question if their area is invalid (ie middle of the transtion to a new area many things will not work). 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | EnterTargetingMode() GetTargetingModeSelectedObject() GetTargetingModeSelectedPosition()
