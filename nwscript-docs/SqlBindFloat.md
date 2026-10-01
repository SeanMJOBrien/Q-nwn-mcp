<!-- Source: https://nwnlexicon.com/index.php/SqlBindFloat -->

# SqlBindFloat(sqlquery, string, float)

Bind a float to a named parameter of the given prepared query. 
void SqlBindFloat( sqlquery sqlQuery, string sParam, float fFloat);
### Parameters 

sqlQuery
    An already prepared SQL query 

sParam
    Parameter referenced in sqlQuery to bind 

fFloat
    Float value to bind
### Description
Bind a float to a named parameter of the given prepared query. 
### Remarks
This allows much easier inputting of variables into a pre-prepared query, removing the need for a large amount of string parsing to simply update certain variables of a query. 
You utilise this by defining the parameter to alter in the prepared query, and reference it as the sParam part. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myint);"); SqlBindFloat(v, "@myint", 5.0); SqlStep(v);
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlBindInt SqlBindString SqlBindVector SqlBindObject
