<!-- Source: https://nwnlexicon.com/index.php/GetPlayerBuildVersionMajor -->

# GetPlayerBuildVersionMajor(object)

Returns the build number of a Player. 
int GetPlayerBuildVersionMajor( object oPlayer);
### Description
Returns the build number of oPlayer (i.e. 8193 if the version is x.xx.8193.8). 
Returns 0 if the given object isn't a player or did not advertise their build info. 
### Remarks
On a persistent world you have to be of the same major version to even connect. For instance 8192 won't be able to connect to 8193, since it implies network changes or other huge version changes. 
However for singleplayer you could load an older module in a newer build - and this could warn the player to get an updated version, or to check some other condition. 
The **1.74**.8193.8 part of the version is solely for module compatibility, with the toolset and game only loading those of that version or lower. This number cannot be retrieved by scripts, there would be no reason to. 
### Version
This function was added in 1.74.8193.10 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetPlayerBuildVersionCommitSha1() GetPlayerBuildVersionMinor() GetPlayerBuildVersionPostfix()
