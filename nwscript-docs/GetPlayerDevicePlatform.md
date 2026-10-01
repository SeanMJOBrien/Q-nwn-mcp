<!-- Source: https://nwnlexicon.com/index.php/GetPlayerDevicePlatform -->

# GetPlayerDevicePlatform(object)

Returns the players device platform, if available. 
int GetPlayerDevicePlatform( object oPlayer);
### Parameters 

oPlayer
    Player object from whom to query device platform
### Description
Returns a PLAYER_DEVICE_PLATFORM_* constant, or PLAYER_DEVICE_PLATFORM_INVALID if unavailable. 
### Remarks
If privacy settings are enabled, or the client is too old, this will return PLAYER_DEVICE_PLATFORM_INVALID. 
### Version
This function was added in 1.85.8193.31 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetPlayerLanguage, GetPlayerDeviceProperty
