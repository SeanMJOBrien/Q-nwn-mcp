<!-- Source: https://nwnlexicon.com/index.php/GetTargetingModeSelectedPosition -->

# GetTargetingModeSelectedPosition()

Gets the target position in the module OnPlayerTarget event. 
vector GetTargetingModeSelectedPosition();
### Description
Returns a vector position of the targeted object or location. If the target is in inventory or the player manually exits targeting mode, returns an empty vector (0.0, 0.0, 0.0) 
### Remarks
See OnPlayerTarget for further information. 
Use GetTargetingModeSelectedObject to capture "exiting" targeting mode. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | EnterTargetingMode() GetTargetingModeSelectedObject() GetLastPlayerToSelectTarget()
