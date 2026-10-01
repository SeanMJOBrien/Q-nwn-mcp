<!-- Source: https://nwnlexicon.com/index.php?title=NuiGetNthWindow&amp;action=history -->

# NuiGetNthWindow(object, int)

Returns the nNth window token of the player, or 0. 
int NuiGetNthWindow( object oPlayer, int nNth = 0);
### Parameters 

oPlayer
    The player to return a nui window for 

nNth
    window counter
#### Description
Returns the nNth window token of the player, or 0. 
#### Remarks
nNth starts at 0. Iterator is not write-safe: Calling DestroyWindow") will invalidate move following offsets by one. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
