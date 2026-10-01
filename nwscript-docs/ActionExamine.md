<!-- Source: https://nwnlexicon.com/index.php/ActionExamine -->

# ActionExamine(object)

Examine an object. 
void ActionExamine( object oExamine);

### Parameters 

oExamine
    Object to examine
### Description
Makes the calling player examine the object oExamine. This causes the examination pop-up box to appear for the object specified. 
### Remarks
This will cause the examination box to pop up - the same one that is available through the radial menu. 
Though this is an action, it finishes immediately. It doesn't wait for the box to be closed to finish - in fact, it doesn't even appear to wait for the dialog box to appear. In testing, adding an ActionSpeakString() directly after the ActionExamine() will cause the string to be spoken BEFORE the examination box appears. This means that, while this may be a useful function, you should be careful when adding this to a larger action queue, as it can perhaps cause unreliable results. 
One obvious use for this function is to have objects that must be examined for the player to find out what they're about. Some players will find it more natural to just click on the objects instead of examining them with the radial menu. With this command, both can accomplish the same result: See the code example. 
### Known Bugs
Can be unreliable together with other actions. See above. 
Don't use this in the OnClientEnter where "not quite actions" like this can crash the client. The player ignores it in other cases such as OnEnter of an area where they're not fully loaded. 
### Version
1.61 
### Example
// This script is placed on a placeable's OnUsed event. It causes a PC that uses// it to examine the placeable.void main(){ object oPC = GetLastUsedBy(); AssignCommand(oPC, ActionExamine(OBJECT_SELF));}
### See Also  
---
