<!-- Source: https://nwnlexicon.com/index.php/DestroyCampaignDatabase -->

# DestroyCampaignDatabase

# DestroyCampaignDatabase(string)
Destroys a campaign database. 
void DestroyCampaignDatabase( string sCampaignName);
#### Parameters
_sCampaignName_
Campaign database to eradicate. 
#### Description
Deletes a campaign database from disk. The campaign database does not go to the computer's recycling bin. After it is deleted, any function using the database will, of course, act as if none were created in the first place. Important Note: Any spaces in sCampaignName are usually removed, stripped, in any Get/SetCampaign*** functions. This doesn't apply to this function, as stated below. For example: - A campaign stored with a string passed in as "Database Name" will be actually stored as "DatabaseName". - When calling DestroyCampaignDatabase("Database Name");, it will actually look for "Database Name", which doesn't exist! Thus, nothing can be deleted. To get around this, make sure by using GetStringLength() and GetSubString(). An example function to wrapper this function (Provided in part by Mike) will help with variable-length, normally-name-based database names. 
#### Remarks
A database consists of files within the database folder of the NWN install directory. Each database uses its own files, so if you have a database called "database1", and one called "database2", they'll be in different files, physically, and destroying one won't do anything to the other. Note that after destroying a campaign database, there's no way of getting it back. 
#### Known Bugs
Rather then a bug, it seems an unintentional non-change to the format of sCampaignName when deleting databases is present. Spaces being removed and string limits do not apply to this function (see Description). 
#### Version
1.62 
#### Example
// Use this function as a wrapper for the function, as to make// sure it enforces no spaces.void DeleteVariableDatabase(string sString){ string sBitString, sNewString; int i; for(i=0; i &lt; GetStringLength(sString); i++) { sBitString = GetSubString(sString, i, 1); // Check for spaces if(sBitString != " ") { sNewString += sBitString; } } // Destroy its database. DestroyCampaignDatabase(sNewString);}
#### See Also  
---
