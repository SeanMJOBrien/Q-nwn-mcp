<!-- Source: https://nwnlexicon.com/index.php?title=GetPlayerDeviceProperty&amp;action=history -->

# GetPlayerDeviceProperty(object, string)

Gets a device property/capability as advertised by the client. 
int GetPlayerDeviceProperty( object oPlayer, string sProperty);
### Parameters 

oPlayer
    player object from whom to query device data 

sProperty
    the device property to read; a PLAYER_DEVICE_PROPERTY_* constant.
### Description
Gets a device property/capability as advertised by the client. 
### Remarks
sProperty is a PLAYER_DEVICE_PROPERTY_* constant. 
Returns -1 if: 
  * the property was never set by the client
  * the the actual value is -1
  * the player is running a older build that does not advertise device properties

There was a privacy option at one point but this was removed. 
### Version
This function was added in 1.85.8193.31 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetPlayerDevicePlatform, GetPlayerLanguage
