<!-- Source: https://nwnlexicon.com/index.php/DeleteCampaignVariable -->

# DeleteCampaignVariable

# DeleteCampaignVariable(string, string, object)
Deletes a campaign variable from the database. 
void DeleteCampaignVariable( string sCampaignName, string sVarName, object oPlayer = OBJECT_INVALID);
#### Parameters
_sCampaignName_
Campaign to delete the variable from (case-sensitive). 
_sVarName_
Variable name to delete. 
_oPlayer_
Player associated with a variable. (Default: OBJECT_INVALID) 
#### Description
Marks a campaign variable of any type within the database for deletion. Important Note: If sCampaignName has a limit of 16 characters. Any spaces in the string put in will be stripped, anything more then 16 characters will be cut down. A string consisting of "Hello there" will become "Hellothere" (Note: Cases sensitive), and thus may cause problems when deleting databases (See Also DestroyCampaignDatabase). 
#### Remarks
By normal database standards, deleting does not actually removed the entry from the database, but flags it as deleted. Do not expect the database files to shrink in size from this command. If you want to 'pack' the database, you will have to do it externally from the game. Unknown how to restore a deleted variable within the database from outside the game. 
NWN:EE - The above is no longer relevant following the database format update. Deleted items are properly deleted. 
#### Version
1.62 This function was updated in 1.80.8193.14 of NWN:EE. Database format updated to SQLite. 
#### See Also  
---
