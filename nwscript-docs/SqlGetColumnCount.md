<!-- Source: https://nwnlexicon.com/index.php?title=SqlGetColumnCount&amp;action=history -->

# SqlGetColumnCount(sqlquery)

Retrieve the column count of a prepared query. 
int SqlGetColumnCount( sqlquery sqlQuery);
### Parameters 

sqlQuery
    An already prepared SQL query
### Description
Retrieve the column count of a prepared query. 
sqlQuery must be prepared before this function is called, but can be called before or after parameters are bound. 
If the prepared query contains no columns (such as with an UPDATE or INSERT query), 0 is returned. 
If a non-SELECT query contains a RETURNING clause, the number of columns in the RETURNING clause will be returned. 
A returned value greater than 0 does not guarantee the query will return rows. 
### Remarks
Use this alongside SqlGetColumnName in a loop to retrieve specific columns and get their header names. Generally this isn't necessary with a properly prepared SELECT statement (don't use `SELECT *` please!). However it might be useful for debugging or automation. 
### Version
This function was added in 1.88.8193.36 of NWN:EE. 
### Example
int nColumns = SqlGetColumnCount(sqlSelect); while (SqlStep(sqlSelect)) { int n; for (n = 0; n < nColumns; n++) { string sColumnName = SqlGetColumnName(sqlSelect, n); string sValue = SqlGetString(sqlSelect, n); SpeakString("nColumn: " + IntToString(n) + " sColumnName: " + sColumnName + " sValue: " + sValue); } }
### See Also
functions:  |  SqlGetColumnName SqlGetInt SqlGetFloat SqlGetString SqlGetVector SqlGetObject
