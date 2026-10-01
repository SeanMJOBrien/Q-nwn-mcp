<!-- Source: https://nwnlexicon.com/index.php/GetIsPC -->

# GetIsPC(object)
Check whether a creature is player controlled. 
int GetIsPC( object oCreature);
#### Parameters
_oCreature_
The creature to check for PC status. 
#### Description
Returns TRUE if oCreature is a player controlled character, otherwise FALSE. A player controlled character is treated as one of the following: a PC, DM avatars, familiars possessed by PCs, monsters possessed by DMs. 
#### Remarks
There are several times GetIsPC() may not work, primarily in multiplayer when a PC has left a "ghost body" behind if they leave a server in On Area Exit events. 
Previous remarks noted that GetAge may be a good workaround, however PCs can set this user created field to 0 so it is identical. 
Instead use the example code below for an MP safe check. It is only necessary in Exit events (On Player Leave is obviously a PC object, so only really On Area Exit events need it). 
Another EE only test is GetEventScript(oObject, EVENT_SCRIPT_CREATURE_ON_HEARTBEAT)) == "default"; unless the server sets PC heartbeats for some reason. 
#### Version
1.29 
#### Example
// Simple GetIsPC check for OnAreaExitvoid main(){ object oCreature = GetExitingObject(); // If PC we do some special stuff // This is only singleplayer safe! if(GetIsPC(oCreature)) { // Count down the number of PCs in this area int nPCs = GetLocalInt(OBJECT_SELF, "LOCAL_PCS"); nPCs--; SetLocalInt(OBJECT_SELF, "LOCAL_PCS", nPCs); }}
// Checks if this is a PC object// object identifiers are 32bit numbers, if converted using ObjectToString().// PCs count down from 7fffffff and all other objects count up from 00000000.// PC objects will start with "7ff" and be 8 characters long.int IsPCObject(object oObject){ string sCreature = ObjectToString(oObject); if(GetStringLength(sCreature) == 8 && GetStringLeft(sCreature, 3) == "7ff") { return TRUE; } return FALSE;}// Same example but MP safevoid main(){ object oCreature = GetExitingObject(); // If PC we do some special stuff. This is always MP safe. if(IsPCObject(oCreature)) { // Count down the number of PCs in this area int nPCs = GetLocalInt(OBJECT_SELF, "LOCAL_PCS"); nPCs--; SetLocalInt(OBJECT_SELF, "LOCAL_PCS", nPCs); }}
#### See Also
functions:  |   GetMaster
