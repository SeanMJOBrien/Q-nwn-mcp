<!-- Source: https://nwnlexicon.com/index.php/SqlGetInt -->

# SqlGetInt(sqlquery, int)

Retrieve a column cast as an integer of the currently stepped row. 
int SqlGetInt( sqlquery sqlQuery, int nIndex);
### Parameters 

sqlQuery
    An already prepared SQL query 

nIndex
    Index of the integer to retrieve
### Description
Retrieve a column cast as an integer of the currently stepped row. 
You can call this after SqlStep() returned TRUE. 
In case of error, 0 will be returned. 
In traditional fashion, nIndex starts at 0. 
### Remarks
Use this to retrieve data from a select SQL query. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// "Widget" is cast as an integer sqlquery n = SqlPrepareQueryObject(GetFirstPC(), "select widget from widgets;"); while (SqlStep(n)) { SendMessageToPC(GetFirstPC(), "Found widget integer: " + IntToString(SqlGetInt(n, 0))); }
// A more complicated example with multiple return valuesvoid main(){ sqlquery sqlSelect = SqlPrepareQueryObject(GetModule(), "SELECT my_int, my_float, my_string, my_vector, my_object FROM storage_table"); // Print info on each item, and spawn the object retrieved while(SqlStep(sqlSelect)) { // Order of columns are as per the above select statement order // Since sqlite is clever, if you wanted to just debug these all of them could be retrieved with sqlGetString // (although they might not look as clean) SpeakString("my_int: " + IntToString(SqlGetInt(sqlSelect, 0))); SpeakString("my_float: " + FloatToString(SqlGetFloat(sqlSelect, 1))); SpeakString("my_string: " + SqlGetString(sqlSelect, 2)); // Vectors are a little more complicated vector vSelect = SqlGetVector(sqlSelect, 3); SpeakString("my_vector: " + FloatToString(vSelect.x) + ", " + FloatToString(vSelect.y) + ", " + FloatToString(vSelect.z)); // Objects need generating before debugging object oCreated = SqlGetObject(sqlSelect, 4, GetStartingLocation()); SpeakString("my_object (created): " + GetName(oCreated)); }}
### See Also
functions:  |  SqlPrepareQueryCampaign SqlPrepareQueryObject SqlGetFloat SqlGetString SqlGetVector SqlGetObject
