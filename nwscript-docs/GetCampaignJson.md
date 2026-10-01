<!-- Source: https://nwnlexicon.com/index.php?title=GetCampaignJson&amp;action=history -->

# GetCampaignJson(string, string, object)

This will read a json from the specified campaign database. 
json GetCampaignJson( string sCampaignName, string sVarName, object oPlayer = OBJECT_INVALID);
### Parameters 

sCampaignName
    a campaign database name 

sVarName
    the campaign variable name to use 

oPlayer
    optional player character object to associate with the json campaign variable
#### Description
This will read a json from the specified campaign database. 
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
