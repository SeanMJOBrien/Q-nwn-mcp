<!-- Source: https://nwnlexicon.com/index.php?title=NuiFindWindow&amp;action=history -->

# NuiFindWindow(object, string)

You can look up windows by ID, if you gave them one. 
int NuiFindWindow( object oPlayer, string sId);
### Parameters 

oPlayer
    The player to create a nui window for 

sId
    a nui window id
#### Description
You can look up windows by ID, if you gave them one. 
#### Remarks
  * Windows with a ID present are singletons - attempting to open a second one with the same ID will fail, even if the json definition is different.

Returns the token if found, or 0. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
You can use this function to get an existing token from a NUI window. Will be 0 if window isn't open. 
int nToken = NuiFindWindow(oPlayer, "MyWindowId"); if (nToken == 0) { // Window isn't open, nothing to do return; } // Window is open and now we have it's nToken so we can perform some updates to it (via NuiSetBind, etc)
More examples can be found in Nui_basic_example
#### See Also
functions:  |  NUI Functions
