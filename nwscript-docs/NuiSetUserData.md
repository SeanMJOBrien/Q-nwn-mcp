<!-- Source: https://nwnlexicon.com/index.php/NuiSetUserData -->

# NuiSetUserData(object, int, json)

Sets an arbitrary json value as userdata on the given window token. 
void NuiSetUserData( object oPlayer, int nToken, json jUserData);
### Parameters 

oPlayer
    The player to get user data for 

nToken
    window token 

jUserData
    arbbitrary user data top set
#### Description
Sets an arbitrary json value as userdata on the given window token. 
#### Remarks
This userdata is not read or handled by the game engine and not sent to clients. This mechanism only exists as a convenience for the programmer to store data bound to a window's lifecycle. Will do nothing if the window does not exist. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions, NuiGetUserData
