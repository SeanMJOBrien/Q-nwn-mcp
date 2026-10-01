<!-- Source: https://nwnlexicon.com/index.php/SqlGetJson -->

# SqlGetJson(sqlquery, int)

Retrieve a column cast as a json value of the currently stepped row. 
json SqlGetJson( sqlquery sqlQuery, int nIndex);
### Parameters 

sqlQuery
    a prepared sql query 

nIndex
    the row index into the query
#### Description
Retrieve a column cast as a json value of the currently stepped row. 
#### Remarks
You can call this after SqlStep returned TRUE. In case of error, a json null value will be returned. In traditional fashion, nIndex starts at 0. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
