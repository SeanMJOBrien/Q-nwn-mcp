<!-- Source: https://nwnlexicon.com/index.php/SqlBindJson -->

# SqlBindJson(sqlquery, string, json)

Bind an json to a named parameter of the given prepared query. 
void SqlBindJson( sqlquery sqlQuery, string sParam, json jValue);
### Parameters 

sqlQuery
    a prepared sql query 

sParam
    named parameter 

jValue
    json to bind
#### Description
Bind an json to a named parameter of the given prepared query. 
#### Remarks
Json values are serialised into a string. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
From nwscript: 
```
 sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myjson);");
 SqlBindJson(v, "@myjson", myJsonObject);
 SqlStep(v);

```
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
