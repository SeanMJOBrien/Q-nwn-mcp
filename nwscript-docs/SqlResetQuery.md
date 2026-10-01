<!-- Source: https://nwnlexicon.com/index.php?title=SqlResetQuery&amp;action=history -->

# SqlResetQuery(sqlquery, int)

Reset the given sqlquery, readying it for re-execution after it has been stepped. 
void SqlResetQuery( sqlquery sqlQuery, int bClearBinds = FALSE);
### Parameters 

sqlQuery
    An already prepared SQL query 

bClearBinds
    Tells the VM wether to preserve or clear the binds on the SQL query.
### Description
Reset the given sqlquery, readying it for re-execution after it has been stepped. All existing binds are kept untouched, unless bClearBinds is TRUE. This command only works on successfully-prepared queries that have not errored out. 
### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

### Version
This function was added in 1.87.8193.35 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlBindInt SqlBindFloat SqlBindString SqlBindVector SqlBindObject
