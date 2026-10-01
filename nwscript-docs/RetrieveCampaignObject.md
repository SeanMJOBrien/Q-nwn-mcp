<!-- Source: https://nwnlexicon.com/index.php?title=RetrieveCampaignObject&amp;action=history -->

# RetrieveCampaignObject(string, string, location, object, object)
Retrieves an object stored in the campaign database. 
object RetrieveCampaignObject( string sCampaignName, string sVarName, location locLocation, object oOwner = OBJECT_INVALID, object oPlayer = OBJECT_INVALID);
#### Parameters 

sCampaignName
    Campaign name to retrieve the value from (case-sensitive). 

sVarName
    Variable's name. 

locLocation
    Location to create the object at. 

oOwner
    Owner to attempt to create the object within. (Default: OBJECT_INVALID) 

oPlayer
    oPlayer associated with the object that was stored in the database. (Default: OBJECT_INVALID) 

bLoadObjectState
    If bLoadObjectState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are read in. (Default: FALSE)
#### Description
Returns an object stored in the campaign database. Campaign names are case-sensitive. If you specify an owner, the object will try to be created in the owner's repository. If the owner can't handle the item (or if the owner is a creature), the item will be created on the ground. 
Remember: This will actually "create" the object. If there is nothing stored, nothing happens, and it returns OBJECT_INVALID. 
Important Note: In sCampaignName any spaces in the string put in will be stripped. A string consisting of "Hello there" will become "Hellothere" (Note: Case sensitive), and thus may cause problems when deleting databases (See Also DestroyCampaignDatabase). 
There may also be a limit on the length of sCamapignName, although if anyone knows, please contact us. 
#### Remarks
Unknown as to what other types of owning objects can't handle an item. Unknown if the location matters when a valid owner is specified (but GetLocation(oOwner) should suffice). Local variables that were on the object when you stored it don't appear to be stored in the database. 
You can now use SqlGetObject and related SQLite functions in NWN:EE. The backend is now all SQLite so these functions just wrapper some standard SQL. 
#### Known Bugs
1.64 reports that it fixed a crash caused by calling RetrieveCampaignObject() when the object being retrieved was gold and the gold was being acquired by a creature. 
#### Version
This function was updated in 1.85.8193.31 of NWN:EE. Added Area (CAF format) as a supported type and bSaveObjectState parameter. 
#### Example
// Re-create our henchmen, stored in DB name "HENCHMEN" and// under name "HENCHMAN_ONE", at the modules starting location.void main(){ // Declare where and what we are retrieving, and get starting location. string sDB = "HENCHMEN"; string sVariable = "HENCHMAN_ONE"; location lTarget = GetStartingLocation(); // Create it at the starting location RetrieveCampaignObject(sDB, sVariable, lTarget);}
#### See Also
functions:  |  StoreCampaignObject SqlGetObject
