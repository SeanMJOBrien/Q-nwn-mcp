<!-- Source: https://nwnlexicon.com/index.php/SendMessageToPC -->

# SendMessageToPC

# SendMessageToPC(object, string)
Sends a message to the PC. 
void SendMessageToPC( object oPlayer, string sMessage);
#### Parameters
_oPlayer_
specific PC to send message to. 
_sMessage_
Message to be sent to the PC. 
#### Description
Send a 'Combat Message' string (sMessage) to the oPlayer. Messages appear as yellow text in any chat windows that display combat messages. 
#### Remarks
Useful tool for debugging scripts; you can use it to display the value of variables, position within a script, etc. If you attempt to send too many SendMessageToPC() commands at the same time the messages will begin to be dropped, causing some of the messages to not appear at all. 
It is possible to have the messages appear in all sorts of colors. It is very easy using the function StringToRGBString. 
#### Version
1.29 
#### Example
// sample debug call, covers many testing bases:void debug( string sMessage ) { SendMessageToPC( GetFirstPC(), sMessage ); SendMessageToAllDMs( sMessage ); PrintString( sMessage );}
#### See Also
functions:  |   SendMessageToPCByStrRef  StringToRGBString
