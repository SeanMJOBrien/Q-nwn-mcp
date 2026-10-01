<!-- Source: https://nwnlexicon.com/index.php/SqlStep -->

# SqlStep(sqlquery)

Executes the given query and fetches a row. 
int SqlStep( sqlquery sqlQuery);
### Parameters 

sqlQuery
    An already prepared SQL query
### Description
Executes the given query and fetches a row; returning TRUE if row data was made available; FALSE otherwise. Note that this will return FALSE even if the query ran successfully but did not return data. 
You need to call SqlPrepareQueryCampaign or SqlPrepareQueryObject and potentially SqlBind* functions before calling this. 
### Remarks
This is required to execute any SQL query, even if there is no "true data" to retrieve, such as when creating a table. Use SqlGetError to retrieve any issues running the query. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
sqlquery n = SqlPrepareQueryObject(GetFirstPC(), "select widget from widgets;"); while (SqlStep(n)) { SendMessageToPC(GetFirstPC(), "Found widget: " + SqlGetString(n, 0)); }
### See Also
functions:  |  SqlPrepareQueryCampaign() SqlPrepareQueryObject() SqlBindInt() SqlBindFloat() SqlBindString() SqlBindVector() SqlBindObject() SqlResetQuery()
