<!-- Source: https://nwnlexicon.com/index.php?title=SetCampaignJson&amp;action=history -->

# SetCampaignJson(string, string, json, object)

This stores a json out to the specified campaign database. 
void SetCampaignJson( string sCampaignName, string sVarName, json jValue, object oPlayer=OBJECT_INVALID);
### Parameters 

sCampaignName
    a campaign database name 

sVarName
    the campaign variable name to use 

jValue
    json to save into the campaign database variable 

oPlayer
    optional player character object to associate with the json campaign variable
#### Description
This stores a json out to the specified campaign database. 
#### Remarks
The database name: 
  * is case insensitive and it must be the same for both set and get functions.
  * can only contain alphanumeric characters, no spaces.

The var name must be unique across the entire database, regardless of the variable type. If you want a variable to pertain to a specific player in the game, provide a player object. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
