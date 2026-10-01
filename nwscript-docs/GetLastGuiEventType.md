<!-- Source: https://nwnlexicon.com/index.php/GetLastGuiEventType -->

# GetLastGuiEventType()

Gets the last triggered GUIEVENT_* in the module OnPlayerGuiEvent event. 
int GetLastGuiEventType();
#### Description
Gets the last triggered GUIEVENT_* in the module OnPlayerGuiEvent event. 
#### Remarks
Depending on the GUIEVENT_* type there are additional properties available with GetLastGuiEventInteger and GetLastGuiEventObject. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerGuiEvent for context and an example. 
#### See Also
functions:  |  GetLastGuiEventPlayer GetLastGuiEventInteger GetLastGuiEventObject  

events:  |  OnPlayerGuiEvent
