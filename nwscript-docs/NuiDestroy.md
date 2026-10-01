<!-- Source: https://nwnlexicon.com/index.php/NuiDestroy -->

# NuiDestroy(object, int)

Destroys the given window, by token, immediately closing it on the client. 
void NuiDestroy( object oPlayer, int nUiToken);
### Parameters 

oPlayer
    The player to create a nui window for 

nUiToken
    The window token id to destroy and close
#### Description
Destroys the given window, by token, immediately closing it on the client. 
#### Remarks
Does nothing if nUiToken does not exist on the client. Does not send a close event - this immediately destroys all serverside state. The client will close the window asynchronously. 
It appears that pending events may still trigger the event handler. For example, if event "click" calls NuiDestroy, there may still be an event "mouseup" in the pipeline which is not cancelled. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
