<!-- Source: https://nwnlexicon.com/index.php?title=GetEventScript&amp;action=history -->

# GetEventScript(object, int)

Returns the event script for the given object and handler. 
string GetEventScript( object oObject, int nHandler);
### Parameters 

oObject
    The object to get the event script from 

nHandler
    An  EVENT_SCRIPT_* constant matching the event to get the script from.
### Description
Returns the event script for the given object and handler. 
Will return "" if unset, the object is invalid, or the object cannot have the requested handler. Note PC's will return "default" as their default script. See remarks. 
### Remarks
PCs have scripts actually set to the word "default" by default - any changes made are not saved to a .bic file. **Therefore be careful you do not create a script called "default" since it might run many times in creature events you don't expect!**
It also means the GetEventScript will never return a blank entry for a PC unless specifically set using SetEventScript. 
See SetEventScript for caveats for what events work on PC objects - quite a few do which is useful! 
When a DM "disables creature AI" this will essentially make event scripts blank - this function returns "" (and it likely also calls ClearAllActions). These scripts are not truly blanked however - when the AI is re-enabled the original scripts are put back silently. If an event script is altered in this state then it will be returned back to pre-disabled script references. Similarly if a DM possesses a creature, or a Wizard possesses their familiar this same condition happens while the possession is happening. 
### Version
This function was added in 1.74.8164 of NWN:EE. 
### See Also
functions:  | SetEventScript()   

constants:  |  EVENT_SCRIPT_* Constant Group
