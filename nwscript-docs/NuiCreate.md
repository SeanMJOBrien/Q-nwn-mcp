<!-- Source: https://nwnlexicon.com/index.php?title=NuiCreate&amp;action=history -->

# NuiCreate(object, json, string)

Create a NUI window inline for the given player. 
int NuiCreate( object oPlayer, json jNui, string sWindowId = "", string sEventScript = "");
### Parameters 

oPlayer
    The player to create a nui window for 

jNui
    The json description of the nuiwindow 

sWindowId
    a short alphanumeric window id 

sEventScript
    is optional and overrides the NUI module event for this window only.
#### Description
Create a NUI window inline for the given player. 
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
