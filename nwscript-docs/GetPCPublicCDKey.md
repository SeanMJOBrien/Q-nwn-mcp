<!-- Source: https://nwnlexicon.com/index.php/GetPCPublicCDKey -->

# GetPCPublicCDKey(object, int)
Retrieves the public version of the PC's CD key. 
string GetPCPublicCDKey( object oPlayer, int nSinglePlayerCDKey = FALSE);
#### Parameters 

oPlayer
    The player whose CD key to retrieve. 

nSinglePlayerCDKey
    If set to TRUE, the player's public CD key will be returned when the player is playing in single player mode (however see notes below). Otherwise returns an empty string in single player mode. (Default: FALSE)
#### Description
Returns the public version of the CD Key that oPlayer uses. The public CD key is 8 characters long and is not the CD key used to install NWN or an expansion. Note the potential bug below, calling this in NWN:EE singleplayer and it returning a blank string due to the key not being generated yet. 
In NWN:EE you can now use GetObjectUUID to get a more unique reference for individual characters a player uses if required. 
#### Remarks
Most likely used with functions such as BootPC() to combat mischievous players from causing havoc on persistent worlds. 
#### Known Bugs
In NWN:EE the function will a blank string until the player clicks "Multiplayer" at least once to generate their CD key (from Steam, GoG, etc.). In 1.69 the CD key usually is copied at game installation time (but if deleted this can also occur in singleplayer). 
Not a bug, but a caveat. OnClientLeave, the PC object (GetExitingObject) is still valid, but the player object (i.e. the human being logged into the server) is not. This means that there are a few things you can't do OnClientLeave. Namely, the GetPCPlayerName, GetPCIPAddress, and GetPCPublicCDKey will not work, since the player is no longer around to get that information from. This can be worked around by storing them as local strings on the PC, for instance OnClientEnter. See workaround below. 
#### Example
//Workaround for the caveat abovevoid main(){ object oPC=GetEnteringObject(); string sPlayerName=GetPCPlayerName(oPC); string sIP=GetPCIPAddress(oPC); string sKey=GetPCPublicCDKey(oPC); SetLocalString(oPC, "player_name", sPlayerName); SetLocalString(oPC, "player_ip", sIP); SetLocalString(oPC, "player_cdkey", sKey);}
#### See Also
functions:  | GetPCPlayerName GetPCIPAddress GetObjectUUID BootPC  

events:  | OnClientEnter OnClientLeave
