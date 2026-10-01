<!-- Source: https://nwnlexicon.com/index.php/GetPlayerBuildVersionCommitSha1 -->

# GetPlayerBuildVersionCommitSha1(object)

Returns the patch commit sha1 of oPlayer. 
string GetPlayerBuildVersionCommitSha1( object oPlayer);
### Parameters 

oPlayer
    player object from whom to query device data
### Description
Returns the patch commit sha1 of oPlayer (i.e. the "abcdef01" out of "87.8193.35-29 abcdef01"). 
Returns "" if the given object isn't a player or did not advertise their build info, or the 
player version is old enough not to send this bit of build info to the server. 
### Remarks
Use this to debug exact versions a player is on, if you wonder why things are working on clients and not another. If they're super old and the value is blank that might cause issues with newer content. 
### Version
This function was added in 1.87.8193.35 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetPlayerBuildVersionMajor() GetPlayerBuildVersionMinor() GetPlayerBuildVersionPostfix()
