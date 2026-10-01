<!-- Source: https://nwnlexicon.com/index.php/SqlBindVector -->

# SqlBindVector(sqlquery, string, vector)

Bind a vector to a named parameter of the given prepared query. 
void SqlBindVector( sqlquery sqlQuery, string sParam, vector vVector);
### Parameters 

sqlQuery
    An already prepared SQL query 

sParam
    Parameter referenced in sqlQuery to bind 

vVector
    Vector value to bind
### Description
Bind a vector to a named parameter of the given prepared query. 
### Remarks
This allows much easier inputting of variables into a pre-prepared query, removing the need for a large amount of string parsing to simply update certain variables of a query. 
You utilise this by defining the parameter to alter in the prepared query, and reference it as the sParam part. 
Note vectors are only part of a location. A full location is made up of a vector, facing (0-360 float) and area object. To store a full location you'll need all of these (with the area being stored with a string referencing its tag, or using ObjectToString/StringToObject). 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
sqlquery v = SqlPrepareQueryObject(GetModule(), "insert into test (col) values (@myint);"); vector vVector = Vector(1.0f, 2.0f, 3.0f); SqlBindVector(v, "@myint", vVector); SqlStep(v);
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlBindInt SqlBindFloat SqlBindString SqlBindObject
