<!-- Source: https://nwnlexicon.com/index.php?title=SetCampaignString&amp;action=history -->

# SetCampaignString(string, string, string, object)
Sets the value of a string in the campaign database. 
void SetCampaignString( string sCampaignName, string sVarName, string sString, object oPlayer = OBJECT_INVALID);
#### Parameters 

sCampaignName
    Campaign name (case-sensitive). 

sVarName
    Variable name. 

sString
    Value to set. 

oPlayer
    Player to associate this variable with. (Default: OBJECT_INVALID)
#### Description
Sets the value of a string within the campaign database. The campaign name is case-sensitive. 
Important Note: In sCampaignName any spaces in the string put in will be stripped. A string consisting of "Hello there" will become "Hellothere" (Note: Case sensitive), and thus may cause problems when deleting databases (See Also DestroyCampaignDatabase). 
There may also be a limit on the length of sCamapignName, although if anyone knows, please contact us. 
#### Remarks
If an object is specified for oPlayer, it is possible to have more than one variable with the same name. However, it has not yet been rigorously tested, and it may be a good idea to use unique variable names anyway. 
Remember: sVarName has a limit of 32 characters, while SetLocal's do not have this limit, the database does, and so adding lots of variable strings together may result in problems! 
It is also important to remember that variables in the database are independent of the savegames. If a player goes back to a previous savegame, he'll still have all the latest variables in the database. While this is unlikely to actually help him, it can potentially corrupt the entire gaming experience for the player. 
Thus, the real strength of the database is probably this: Ability to store variables in PWs on a regular basis, so a lot of information isn't lost (for instance, backup of variables can happen every hour or so). And it provides an easy way to transfer information between two or more modules, for instance in an official campaign type setting. 
Previous notes on slowness are now redundant in NWN:EE which uses much speedier SQLite. This function is equivalent of setting a string on an external sqlite DB. 
#### Known Bugs
There was a problem with storing player specific data in patch 1.30 (only Shadows of Undrentide, though). The fix in patch 1.31 would break compatibility between SoU 1.30 and SoU 1.31 player specific database access. 
Not a bug, but a caveat: The database uses information about the player to store PC specific information. Thus, you can't use the PC as the oPlayer parameter in the database functions. This one is a little harder to work around. One thing you could perhaps do is ignore the oPlayer parameter, and then construct a variable name based on some of the info stored about the player OnClientEnter (see the workaround). 
#### Version
1.61 - Added 
This function was updated in 1.81.8193.15 of NWN:EE. All internal SQL functions now updated to speedy SQLite. 
This function was updated in 1.84.8193.29 of NWN:EE. Fixed SetCampaignString(, “”) resulting in a SQL error. Now it deletes the variable from the database instead. It now also deletes entries when other types are “empty”. 
#### Example
// Workaround for the caveat abovevoid main(){ object oPC=GetEnteringObject(); string sPlayerName=GetPCPlayerName(oPC); string sIP=GetPCIPAddress(oPC); string sKey=GetPCPublicCDKey(oPC); SetLocalString(oPC, "player_name", sPlayerName); SetLocalString(oPC, "player_ip", sIP); SetLocalString(oPC, "player_cdkey", sKey);}
#### See Also
functions:  |  GetCampaignString
