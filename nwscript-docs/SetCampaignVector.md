<!-- Source: https://nwnlexicon.com/index.php/SetCampaignVector -->

# SetCampaignVector

# SetCampaignVector(string, string, vector, object)
Sets the value of a vector in the campaign database. 
void SetCampaignVector( string sCampaignName, string sVarName, vector vVector, object oPlayer = OBJECT_INVALID);
#### Parameters
_sCampaignName_
Campaign name (case-sensitive). 
_sVarName_
Variable name. 
_vVector_
Value to set. 
_oPlayer_
Player to associate this variable with. (Default: OBJECT_INVALID) 
#### Description
Sets the value of a vector within the campaign database. The campaign name is case-sensitive. A vector is a set of 3 floats, positions (X, Y, Z) - and there is no default SetLocalVector and GetLocalVector. See the function Vector for more information on vectors and how they work. Important Note: In sCampaignName any spaces in the string put in will be stripped. A string consisting of "Hello there" will become "Hellothere" (Note: Case sensitive), and thus may cause problems when deleting databases (See Also DestroyCampaignDatabase). There may also be a limit on the length of sCamapignName, although if anyone knows, please contact us. 
#### Remarks
If an object is specified for oPlayer, it is possible to have more than one variable with the same name. However, it has not yet been rigourously tested, and it may be a good idea to use unique variable names anyway. Remember: sVarName has a limit of 32 characters, while SetLocal's do not have this limit, the database does, and so adding lots of variable strings together may result in problems! Moreover, database access in NWN is slow. It is a good idea to store variables locally, then transfer and read them to and from database only when you need to. (NWN:EE - The database format update significantly improved this) It is also important to remember that variables in the database are independent of the savegames. If a player goes back to a previous savegame, he'll still have all the latest variables in the database. While this is unlikely to actually help him, it can potentially corrupt the entire gaming experience for the player. Thus, the real strength of the database is probably this: Ability to store variables in PWs on a regular basis, so a lot of information isn't lost (for instance, backup of variables can happen every hour or so). And it provides an easy way to transfer information between two or more modules, for instance in an official campaign type setting. 
#### Known Bugs
There was a problem with storing player specific data in patch 1.30 (only Shadows of Undrentide, though). The fix in patch 1.31 would break compatibility between SoU 1.30 and SoU 1.31 player specific database access. Not a bug, but a caveat: The database uses information about the player to store PC specific information. Thus, you can't use the PC as the oPlayer parameter in the database functions. This one is a little harder to work around. One thing you could perhaps do is ignore the oPlayer parameter, and then construct a variable name based on some of the info stored about the player OnClientEnter (see the workaround). 
#### Version
1.62 This function was updated in 1.80.8193.14 of NWN:EE. Database format updated to SQLite. 
#### Example
//Workaround for the caveat abovevoid main(){ object oPC=GetEnteringObject(); string sPlayerName=GetPCPlayerName(oPC); string sIP=GetPCIPAddress(oPC); string sKey=GetPCPublicCDKey(oPC); SetLocalString(oPC, "player_name", sPlayerName); SetLocalString(oPC, "player_ip", sIP); SetLocalString(oPC, "player_cdkey", sKey);}
#### See Also
functions:  |   GetCampaignVector
