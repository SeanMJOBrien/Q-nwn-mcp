<!-- Source: https://nwnlexicon.com/index.php/SqlGetError -->

# SqlGetError(sqlquery)

Returns "" if the last SQL command succeeded; or a human-readable error otherwise. 
string SqlGetError( sqlquery sqlQuery);
### Parameters 

sqlQuery
    SQL query to check
### Description
Returns "" if the last SQL command succeeded; or a human-readable error otherwise. 
Additionally, all SQL errors are logged to the server log and spoken to all players (with NWNX this part can be disabled). 
### Remarks
This is useful to check if there is a problem with the last SQL command issued if it is a potentially problematic one. If blank it is fine, if not then the error can be printed somewhere and error handling can take place. 
Generally these can cause errors: 
  * calling SqlStep() with an unprepared statement
  * preparing a statement against a database for which you lost the connection
  * binding parameters in an unprepared statement
  * binding parameters against a prepared statement that has already been executed (without resetting it)
  * binding a parameter that doesn't exist in the prepared statement
  * binding an invalid, non-existent or otherwise un-serializable object with SqlBindObject()
  * Calling SqlGetXXX() with an unprepared or unexecuted (non-stepped) statement, or using an index from a column that doesn't exist
  * Retrieving an un-deserializable object with SqlGetObject()

### Version
This function was added in 1.80.8193.14 of NWN:EE. 
This function was updated in 1.86.8193.35 of NWN:EE. Now the SQL errors are displayed to players to aid error checking. 
### Example
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject
