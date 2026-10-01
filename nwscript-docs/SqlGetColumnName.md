<!-- Source: https://nwnlexicon.com/index.php/SqlGetColumnName -->

# SqlGetColumnName(sqlquery, int)

Retrieve the column name of the Nth column of a prepared query. 
int SqlGetColumnName( sqlquery sqlQuery, int nNth);
### Parameters 

sqlQuery
    An already prepared SQL query 

nNth
    Index of the column to retrieve (0 indexed)
### Description
Retrieve the column name of the Nth column of a prepared query. 
sqlQuery must be prepared before this function is called, but can be called before or after parameters are bound. 
If the prepared query contains no columns (such as with an UPDATE or INSERT query), an empty string is returned. 
If a non-SELECT query contains a RETURNING clause, the name of the nNth column in the RETURNING clause is returned. 
If nNth is out of range, an sqlite error is broadcast and an empty string is returned. 
The value of the AS clause will be returned, if the clause exists for the nNth column. 
A returned non-empty string does not guarantee the query will return rows. 
### Remarks
Use this alongside SqlGetColumnCount in a loop to retrieve specific columns and get their header names. Generally this isn't necessary with a properly prepared SELECT statement (don't use SELECT * please!). However it might be useful for debugging or automation. 
### Version
This function was added in 1.88.8193.36 of NWN:EE. 
### Example
int nColumns = SqlGetColumnCount(sqlSelect); while (SqlStep(sqlSelect)) { int n; for (n = 0; n < nColumns; n++) { string sColumnName = SqlGetColumnName(sqlSelect, n); string sValue = SqlGetString(sqlSelect, n); SpeakString("nColumn: " + IntToString(n) + " sColumnName: " + sColumnName + " sValue: " + sValue); } }
### See Also
functions:  |  SqlGetColumnCount SqlGetInt SqlGetFloat SqlGetString SqlGetVector SqlGetObject
