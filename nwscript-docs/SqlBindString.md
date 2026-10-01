<!-- Source: https://nwnlexicon.com/index.php/SqlBindString -->

# SqlBindString(sqlquery, string, string)

Bind a string to a named parameter of the given prepared query. 
void SqlBindString( sqlquery sqlQuery, string sParam, string sString);
### Parameters 

sqlQuery
    An already prepared SQL query 

sParam
    Parameter referenced in sqlQuery to bind 

sString
    String value to bind
### Description
Bind an string to a named parameter of the given prepared query. 
### Remarks
This allows much easier inputting of variables into a pre-prepared query, removing the need for a large amount of string parsing to simply update certain variables of a query. 
You utilise this by defining the parameter to alter in the prepared query, and reference it as the sParam part. 
You should use this to store object references (not serialised objects themselves as per SqlBindObject) using ObjectToString and StringToObject. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myint);"); SqlBindString(v, "@myint", "Hello"); SqlStep(v);
To bind an object reference: 
sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myint);"); string sOID = ObjectToString(GetObjectByTag("NPC")); SqlBindString(v, "@myint", sOID); SqlStep(v);
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlBindInt SqlBindFloat SqlBindVector SqlBindObject
