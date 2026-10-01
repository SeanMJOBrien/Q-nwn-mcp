<!-- Source: https://nwnlexicon.com/index.php?title=GetPlayerBuildVersionMinor&amp;action=history -->

# GetPlayerBuildVersionMinor(object)

Returns the patch revision of a Player. 
int GetPlayerBuildVersionMinor( object oPlayer);
### Parameters 

oPlayer
    player object from whom to query device data
### Description
Returns the patch revision of oPlayer (i.e. 8 if the version is x.xx.8193.8). 
Returns 0 if the given object isn't a player or did not advertise their build info. 
### Remarks
On a persistent world you have to be of the same major version to even connect. For instance 8192 won't be able to connect to 8193, since it implies network changes or other huge version changes. 
However minor versions are usually compatible but the client may not have all the newer features or content - for instance content such as new tilesets. These people could be rejected from the server if they're on an older version and asked to update (or you log it and know what people are using so include the relevant missing files in nwsync). 
The **1.74**.8193.8 part of the version is solely for module compatibility, with the toolset and game only loading those of that version or lower. This number cannot be retrieved by scripts, there would be no reason to. 
For single player this minor build can be useful if you have a minor version you need for a particular script function that is the same module version, although usually module compatibility is bumped for new script commands and other toolset features (such as script parameters in conversations). 
### Version
This function was added in 1.74.8193.10 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetPlayerBuildVersionCommitSha1() GetPlayerBuildVersionMajor() GetPlayerBuildVersionPostfix()
