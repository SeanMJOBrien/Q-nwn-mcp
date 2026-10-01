<!-- Source: https://nwnlexicon.com/index.php/EventUserDefined -->

# EventUserDefined(int)
Returns an event of the type nUserDefinedEventNumber. 
event EventUserDefined( int nUserDefinedEventNumber);

### Parameters 

nUserDefinedEventNumber
    A number used to identify the type of event to signal.
### Description
EventUserDefined() is used with the SignalEvent() function to cause the OnUserDefined event to trigger and run the script assigned. Within the OnUserDefined script, nUserDefinedEventNumber can be retrieved using the GetUserDefinedEventNumber() function. 
nUserDefinedEventNumber can be one of the standard event numbers (see the object's default OnSpawn script) or a custom number. 
### Remarks
EventUserDefined only creates the event. SignalEvent() must still be called to cause the event to be triggered. 
The importance of UserEvents is in the ability to execute custom code to deal with unique situations without modifying the default scripts NWN assigns to the events. 
### Version
1.22 
### Example
// Example 1 - The following code creates a custom user event// of 1234 as eSpecialEvent, then triggers the OnUserDefined// event of oNPC and passes eSpecialEvent to it.object oNPC;event eSpecialEvent;eSpecialEvent = EventUserDefined(1234);SignalEvent(oNPC, eSpecialEvent);
### See Also
functions:  |  SignalEvent  

constants:  |   Event Constants   
events:  |  OnUserDefined Event
