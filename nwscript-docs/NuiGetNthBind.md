<!-- Source: https://nwnlexicon.com/index.php/NuiGetNthBind -->

# NuiGetNthBind(object, int, int, int)

Return the nNth bind name of the given window, or "". 
string NuiGetNthBind( object oPlayer, int nToken, int bWatched, int nNth = 0);
### Parameters 

oPlayer
    The player to return a nui window for 

nToken
    window token 

bWatched
    a parameter to control whether to filter for watched binds or not 

nNth
    window counter
#### Description
Return the nNth bind name of the given window, or "". 
#### Remarks
If bWatched is TRUE, iterates only watched binds. If FALSE, iterates all known binds on the window (either set locally or in UI). 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
