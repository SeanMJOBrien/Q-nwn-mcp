<!-- Source: https://nwnlexicon.com/index.php?title=NuiCreateFromResRef&amp;action=history -->

# NuiCreateFromResRef(object, string, string)

Create a NUI window from the given resref(.jui) for the given player. 
int NuiCreateFromResRef( object oPlayer, string sResRef, string sWindowId = "", string sEventScript = "");
### Parameters 

oPlayer
    The player to create a nui window for 

sResRef
    The .jui resref of the window to open 

sWindowId
    a short alphanumeric window id 

sEventScript
    is optional and overrides the NUI module event for this window only.
#### Description
Create a NUI window from the given resref(.jui) for the given player. 
The resref needs to be available on the client, not the server. 
The token is a integer for ease of handling only. You are not supposed to do anything with it, except store/pass it. 
The window ID needs to be alphanumeric and short. Only one window (per client) with the same ID can exist at a time. 
Re-creating a window with the same id of one already open will immediately close the old one. 
Returns the window token on success (>0), or 0 on error. 
#### Remarks
See nw_inc_nui.nss or the NUI functions category for full documentation. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. NuiCreate() and NuiCreateFromResRef() now have a sEventScript parameter. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
