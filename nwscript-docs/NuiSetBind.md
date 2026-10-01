<!-- Source: https://nwnlexicon.com/index.php/NuiSetBind -->

# NuiSetBind(object, int, string, json)

Sets a json value for the given player, token and bind. 
void NuiSetBind( object oPlayer, int nUiToken, string sBindName, json jValue);
### Parameters 

oPlayer
    The player to set a json value for 

nUiToken
    the ui token 

sBindName
    the json bind 

jValue
    the json value
#### Description
Sets a json value for the given player, token and bind. 
#### Remarks
The value is synced down to the client and can be used in UI binding. When the UI changes the value, it is returned to the server and can be retrieved via NuiGetBind(). 
  * json values can hold all kinds of values; but NUI widgets require specific bind types. It is up to you to either handle this in NWScript, or just set compatible bind types. No auto-conversion happens.
  * If the bind is on the watch list, this will immediately invoke the event handler with the "watch" even type; even before this function returns. Do not update watched binds from within the watch handler unless you enjoy stack overflows.

Does nothing if the given player+token is invalid. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
