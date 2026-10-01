<!-- Source: https://nwnlexicon.com/index.php?title=NuiSetGroupLayout&amp;action=history -->

# NuiSetGroupLayout(object, int, string, json)

Swaps out the given element (by id) with the given nui layout (partial). 
void NuiSetGroupLayout( object oPlayer, int nUiToken, string sElement, json jNui);
### Parameters 

oPlayer
    The player to swap out a nui element for 

nUiToken
    window id token 

sElement
    element to swap out 

jNui
    nui layout to swap in
#### Description
Swaps out the given element (by id) with the given nui layout (partial). 
#### Remarks
  * This currently only works with the "group" element type, and the special "_window_" root group.

#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions, NuiGroup, NuiWindow
