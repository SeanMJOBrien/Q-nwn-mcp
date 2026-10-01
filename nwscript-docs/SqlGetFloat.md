<!-- Source: https://nwnlexicon.com/index.php/SqlGetFloat -->

# SqlGetFloat(sqlquery, int)

Retrieve a column cast as a float of the currently stepped row. 
float SqlGetFloat( sqlquery sqlQuery, int nIndex);
### Parameters 

sqlQuery
    An already prepared SQL query 

nIndex
    Index of the float to retrieve
### Description
Retrieve a column cast as a float of the currently stepped row. 
You can call this after SqlStep() returned TRUE. 
In case of error, 0 will be returned. 
In traditional fashion, nIndex starts at 0. 
### Remarks
Use this to retrieve data from a select SQL query. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// "Widget" is cast as a float sqlquery n = SqlPrepareQueryObject(GetFirstPC(), "select widget from widgets;"); while (SqlStep(n)) { SendMessageToPC(GetFirstPC(), "Found widget float: " + FloatToString(SqlGetFloat(n, 0))); }
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlGetInt SqlGetString SqlGetVector SqlGetObject
