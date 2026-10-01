<!-- Source: https://nwnlexicon.com/index.php/Get2DAColumn -->

# Get2DAColumn(object, int)

Returns a column name in a specific 2da. 
string Get2DAColumn( string s2DA, int nColumnIdx);
#### Parameters 

s2DA
    The 2DA to check the column name of 

nColumnIdx
    The column index, starting at 0.
#### Description
Returns the column name of s2DA at nColumnIdx index (starting at 0). 
Returns "" if column nColumnIdx doesn't exist (at end). 
#### Remarks
The column names are made lowercase, so it will always return "label" never "LABEL" or "Label" - this is apparently how the game stores the names. 
This can be useful for automatically parsing 2da files, both user and game engine, in larger queries automatically, especially in combination with Get2DARowCount. 
#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
#### See Also
functions:  |  Get2DAString Get2DARowCount
