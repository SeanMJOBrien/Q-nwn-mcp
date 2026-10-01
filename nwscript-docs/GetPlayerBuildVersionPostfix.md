<!-- Source: https://nwnlexicon.com/index.php/GetPlayerBuildVersionPostfix -->

# GetPlayerBuildVersionPostfix(object)

Returns the patch postfix of oPlayer (i.e. the 29 out of "87.8193.35-29 abcdef01"). 
int GetPlayerBuildVersionPostfix( object oPlayer);
### Parameters 

oPlayer
    player object from whom to query device data
### Description
Returns the patch postfix of oPlayer (i.e. the 29 out of "87.8193.35-29 abcdef01"). 
Returns 0 if the given object isn't a player or did not advertise their build info, or the player version is old enough not to send this bit of build info to the server. 
### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

### Version
This function was added in 1.87.8193.35 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetPlayerBuildVersionCommitSha1() GetPlayerBuildVersionMajor() GetPlayerBuildVersionMinor()
