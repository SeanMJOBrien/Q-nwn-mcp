<!-- Source: https://nwnlexicon.com/index.php?title=ActivatePortal&amp;action=history -->

# ActivatePortal(object, string, string, string, int)

Send a player's client to a new server, where the player's character will log in. 
void ActivatePortal( object oTarget, string sIPaddress = "", string sPassword = "", string sWaypointTag = "", int bSeamless = FALSE);

### Parameters 

oTarget
    PC of the client to transfer. 

sIPaddress
    DNS name or IP address (and optional port) of new server. (Default: "") 

sPassword
    Password for login to the destination server. (Default: "") 

sWaypointTag
    If set, arriving PCs will jump to this waypoint after appearing at the start location. (Default: "") 

bSeamless
    If TRUE, the transition will be made 'seamless', and the PC will not get a dialogue box on transfer. (Default: FALSE)
### Description
ActivatePortal() attempts to redirect a client to a new server (for example when hopping about in connected semi-persistent worlds). 
sIPaddress can be a numeric IP Address (e.g. 192.168.0.84) or an alphanumeric DNS name ("www.bioware.com"), and can also include a port setting (192.168.0.84:5121 or "www.bioware.com:5121"). If no port is specified, it will default to 5121. 
sPassword is the login password for the destination server 
If sWaypointTag is set, after portalling the character will be moved to this waypoint, if it exists. 
If bSeamless is set to TRUE, the client will not be prompted with the information window telling them about the server, and they will not be allowed to save a copy of their character (if they are using a local vault character). 
### Remarks
This works for portalling within a module, too, but briefly pops up a 'logging in' window - even in 'seamless' mode. 
The non-seamless popup is heinously ugly, and says nothing about what's going on. You may want to provide some information to a PC before portalling them if you use the default option. 
### Known Bugs
Waypoint tags must be all upper-case for the waypoint jump to work on arrival. 
Leaving a trigger by ActivatePortal does not fire its OnExit event. An Area's OnExit is (correctly) fired. 
### Version
1.22 
### Example
// In the OnUsed of a statue// Sends the using PC to another (fictional) server with player password// "mumb0Jumb0", and has the PC appear at waypoint "ISK_WP_PORTAL". The// player will not be notified that they've moved servers.#include "nw_i0_generic"void main() { object oPC = GetLastUsedBy(); if ((PC)) return; ActivatePortal(oPC, "nwn.iskander.tv:5432", "mumb0Jumb0", "ISK_WP_PORTAL", TRUE);}
### See Also
functions:  |  ActionJumpToLocation   

events:  | OnClientLeave Event
