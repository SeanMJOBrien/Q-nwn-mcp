<!-- Source: https://nwnlexicon.com/index.php/GetRandomUUID -->

# GetRandomUUID()

Returns a UUID. This UUID will not be associated with any object. 
string GetRandomUUID();
### Description
Returns a UUID. This UUID will not be associated with any object. 
The generated UUID is currently a v4. 
### Remarks
This can be used to have specific SQL referenced UUID "things" uniquely defined. For instance if you have a concept of a "Player House" and want to make sure the DB entry for storing it's location, contents and other information in a DB is uniquely defined (since a player may have more than one house). The house "object" never really exists but it will mean no clashes with any other player house information. 
### Version
This function was added in 1.74.8188 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetObjectByUUID, GetObjectUUID, ForceRefreshObjectUUID
