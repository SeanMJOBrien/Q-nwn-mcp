<!-- Source: https://nwnlexicon.com/index.php/UnlockAchievement -->

# UnlockAchievement(object, string, int, int, int)

Unlock an achievement for the given player who must be logged in. 
void UnlockAchievement( object oPlayer, string sID, int nLastValue=0, int nCurValue=0, int nMaxValue=0);
### Parameters 

oPlayer
    A Player object to target with the UnlockAchievement command. 

sID
    sID is the achievement ID on the remote server. 

nLastValue
    nLastValue is the previous value of the associated achievement stat. (Default: 0) 

nCurValue
    nCurValue is the current value of the associated achievement stat. (Default: 0) 

nMaxValue
    nMaxValue is the maximum value of the associated achievement stat. (Default: 0)
### Description
Unlock an achievement for the given player who must be logged in to Steam or GoG to get it. 
The function only will activate an achievement if it is an official module running (ie a .nwm file) not with custom modules, however no other checks are made (eg modified nwm file, script window, debug mode, DM mode etc.). 
### Remarks
This actually sends network traffic to the given player to tell the client to unlock the given achievement so it works in multiplayer as well. 
The sID is a unique ID string value, but is hardly hidden, they're available in official modules in the game files, search for this function name to find them. 
If you want to unlock everything just load an official module and you can unlock them all at once in the script window. 
However since you can't add your own achievements, nor activate this in custom modules, there is no point to using this at all and the function can be ignored. 
### Version
1.74.8188 Note that the description of this function was omitted from the release notes. The function is described in nwscript. 
### See Also
