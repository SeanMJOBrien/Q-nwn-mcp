<!-- Source: https://nwnlexicon.com/index.php/SqlBindInt -->

# SqlBindInt(sqlqery, string, int)

Bind an integer to a named parameter of the given prepared query. 
void SqlBindInt( sqlquery sqlQuery, string sParam, int nValue);
### Parameters 

sqlQuery
    An already prepared SQL query 

sParam
    Parameter referenced in sqlQuery to bind 

nValue
    Integer value to bind
### Description
Bind an integer to a named parameter of the given prepared query. 
### Remarks
This allows much easier inputting of variables into a pre-prepared query, removing the need for a large amount of string parsing to simply update certain variables of a query. 
You utilise this by defining the parameter to alter in the prepared query, and reference it as the sParam part. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myint);"); SqlBindInt(v, "@myint", 5); SqlStep(v);
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlBindFloat SqlBindString SqlBindVector SqlBindObject
