<!-- Source: https://nwnlexicon.com/index.php/SqlPrepareQueryCampaign -->

# SqlPrepareQueryCampaign(string, string)

Sets up a query for the campaign database. 
sqlquery SqlPrepareQueryCampaign( string sDatabase, string sQuery);
### Parameters 

sDatabase
    The name of a campaign database. 

sQuery
    SQL Query to prepare
### Description
Sets up a query. 
This will NOT run the query; only make it available for parameter binding. 
To run the query, you need to call SqlStep(); even if you do not expect result data. 
Note that when accessing campaign databases, you do not write access to the builtin tables needed for CampaignDB functionality. 
N.B.: You can pass sqlqueries into DelayCommand; HOWEVER **they will NOT survive a game save/load**. Any commands on a restored sqlquery will fail. It is highly recommended to not use sqlqueries with DelayCommand or AssignCommand at all. 
Please check the SQLite_README.txt file in lang/en/docs/ for the list of builtin functions. 
### Remarks
This will prepare a SQL query for the campaign database specified. The campaign database is outside of a module, and a player character, meaning it can span modules and even characters. It also exists as a separate file that can be queried, or even edited, separately from the game itself. 
While it isn't a very good use case, the sqlite DB created can be changed by other copies of the game or external tools with lock permissions on the filesystem (NFS is not supported). 
To find out if a prepared query has completed successfully run SqlGetError. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
This function was updated in 1.83.8193.21 of NWN:EE. There are additional builtin functions added to the SQLite; nwbufcompress, nwbufdecompress, base64encode, base64decode, sha1, xxh32 and xxh64. 
### Example
### See Also
functions:  |  SqlGetError() SqlPrepareQueryObject() SqlResetQuery()
