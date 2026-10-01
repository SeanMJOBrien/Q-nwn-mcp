<!-- Source: https://nwnlexicon.com/index.php?title=SqlPrepareQueryObject&amp;action=history -->

# SqlPrepareQueryObject(object, string)

Sets up a query for the given object database. 
sqlquery SqlPrepareQueryObject( object oObject, string sQuery);
### Parameters 

oObject
    Can be either the module (GetModule()), or a player character. 

sQuery
    SQL Query to prepare
### Description
Sets up a query. 
This will NOT run the query; only make it available for parameter binding. 
To run the query, you need to call SqlStep(); even if you do not expect result data. 
oObject can be either the module (GetModule()), or a player character. The database is persisted to savegames in case of the module, and to character files in case of a player characters. Other objects cannot carry databases, and this function call will error for them (see SqlGetError). 
N.B: Databases on objects (especially player characters!) should be kept to a reasonable size. Delete old data you no longer need. If you attempt to store more than a few megabytes of data on a player creature, you may have a bad time. 
N.B.: You can pass sqlqueries into DelayCommand; HOWEVER **they will NOT survive a game save/load**. Any commands on a restored sqlquery will fail. It is highly recommended to not use sqlqueries with DelayCommand or AssignCommand at all. 
Please check the SQLite_README.txt file in lang/en/docs/ for the list of builtin functions. 
### Remarks
This will prepare a SQL query for the object specified: 
  * The players SQL database is actually stored in the .bic when exported, otherwise is saved as part of the save game.
  * The modules SQL database is stored entirely in save games, a new start of a module for any reason (even StartModule()) creates a new one for that instance of it.

The module database is recommended for very quick "local" SQL usage, tied not to a single player. This is co-op safe. The player SQL is best used for persistent settings on an individual in a online module/PW, or for a players module-to-module settings such as class abilities. The player one is not safe to store quest data only for the present module in a co-op scenario. 
Neither are accessible outside of the game easily, for that usage you should use a campaign database. 
To find out if a prepared query has completed successfully run SqlGetError. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
This function was updated in 1.83.8193.21 of NWN:EE. There are additional builtin functions added to the SQLite; nwbufcompress, nwbufdecompress, base64encode, base64decode, sha1, xxh32 and xxh64. 
This function was updated in 1.88.8193.36 of NWN:EE. SqlPrepareQueryObject() temporary databases are now entirely in-memory (:memory:). 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  |  SqlGetError() SqlPrepareQueryCampaign() SqlResetQuery()
