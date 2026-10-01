<!-- Source: https://nwnlexicon.com/index.php?title=NuiGetBind&amp;action=history -->

# NuiGetBind(object, int, string)

Gets the json value for the given player, token and bind. 
json NuiGetBind( object oPlayer, int nUiToken, string sBindName);
### Parameters 

oPlayer
    The player to return a nui window json for 

nUiToken
    The nui window token 

sBindName
    the bind
#### Description
Gets the json value for the given player, token and bind. 
#### Remarks
  * json values can hold all kinds of values; but NUI widgets require specific bind types. It is up to you to either handle this in NWScript, or just set compatible bind types. No auto-conversion happens.

Returns a json null value if the bind does not exist. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
