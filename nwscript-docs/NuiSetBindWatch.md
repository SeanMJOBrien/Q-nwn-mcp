<!-- Source: https://nwnlexicon.com/index.php/NuiSetBindWatch -->

# NuiSetBindWatch(object, int, string, int)

Mark the given bind name as watched. 
int NuiSetBindWatch( object oPlayer, int nUiToken, string sBind, int bWatch);
### Parameters 

oPlayer
    The player to mark a bind watched 

nUiToken
    a window token id 

sBind
    the bind to mark watched 

bWatch
    TRUE or FALSE - watched or not watched
#### Description
Mark the given bind name as watched. 
#### Remarks
A watched bind will invoke the NUI script event every time it's value changes. Be careful with binding nui data inside a watch event handler: It's easy to accidentally recurse yourself into a stack overflow. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
