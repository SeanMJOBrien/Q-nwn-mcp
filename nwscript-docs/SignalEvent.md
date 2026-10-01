<!-- Source: https://nwnlexicon.com/index.php/SignalEvent -->

# SignalEvent(object, event)
Causes an object to fire a specified event. 
void SignalEvent( object oObject, event evToRun);
### Parameters 

oObject
    The Object you want to have run an event. 

evToRun
    The event to have the object run. Must be constructed using one of the event functions.
### Description
Causes oObject to run evToRun. Allows objects to fire off events in other objects. The events you can run include the default events provided by Bioware as well as user defined events the object has scripted. The event parameter must be an actual event created by one of the many event functions. 
### Remarks
The only events which are valid are: 
  * EventActivateItem(): calls a modules OnActivateItem Item script.
  * EventConversation(): which calls an objects OnConversation script.
  * EventSpellCastAt(): fires an objects OnSpellCastAt script.
  * EventUserDefined(): fires an object/module/area's OnUserDefined Event script.

They could be defined, but it is more likely they are put directly into the SignalEvent(), like the example below. 
Note that event signals are done as if it was DelayCommand(0.0, ExecuteScript()); and do not occupy the same script execution of the calling script. 
### Version
1.64 
### Example
// Fire the modules event 100, which could trigger some event such as a cutscene.void main(){ // Get the module object oModule = GetModule(); // Signal the user defined event SignalEvent(oModule, EventUserDefined(100));}
### See Also
functions:  |  EventUserDefined EventActivateItem EventConversation EventSpellCastAt  

constants:  |   Event Constants
