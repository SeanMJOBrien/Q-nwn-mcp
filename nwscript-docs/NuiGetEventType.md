<!-- Source: https://nwnlexicon.com/index.php/NuiGetEventType -->

# NuiGetEventType()

Returns the event type of the current event. 
string NuiGetEventType();
#### Description
Returns the event type of the current event. 
#### Remarks
  * See nw_inc_nui.nss for full documentation of all events.

Documentation doesn't seem to be there, apart from a reference to "closed" which is incorrect 
By trial and error, events returned seem to include 
Event Type  | Description  | Used By  | Notes   
---|---|---|---  
watch  |  |  |   
open  | When window is first opened.  | NuiWindow | NuiGetEventElement returns main window which is always "_window_"   
close  | When window is closed.  | NuiWindow | NuiGetEventElement returns main window which is always "_window_"   
click  |  |  |   
mouseup  |  |  |   
mousedown  |  |  |   
mousescroll  |  |  |   
range  |  | NuiList, and maybe more types of nui stuff  |   
focus  |  | NuiTextEdit  |   
blur  |  | NuiTextEdit  |   
note mouseup, mousedown, mousescroll, and range use NuiGetEventPayload to get data that the event would deliver (for instance, mouseup/mousedown has cursor locations, and range shows items in the list are visible to the player, as just some examples). 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
