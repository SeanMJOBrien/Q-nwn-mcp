<!-- Source: https://nwnlexicon.com/index.php?title=Get2DARowCount&amp;action=history -->

# Get2DARowCount(string)

Returns the number of defined rows in the 2da s2DA. 
int Get2DARowCount( string s2DA);
#### Parameters 

s2DA
    The 2DA to check the number of defined rows in
#### Description
Returns the number of defined rows in the 2da s2DA. 
#### Remarks
Returns 0 if the 2da isn't available; you can also check for a specific 2da in resman with ResManGetAliasFor or ResManFindPrefix. See Get2DAString for notes on 2da caching. 
This is useful for looping entire 2da files with Get2DAString. You can also combine it with Get2DAColumn to inspect entire 2da contents dynamically. 
Note that for large 2da files (extended in EE commonly) you can easily TOO_MANY_INSTRUCTIONS (TMI) on looping large amounts of 2da data. See GetScriptInstructionsRemaining for a way to avoid this. 
#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
// Example for Get2DARowCount// // Get2DARowCount("racialtypes"); returns 30 rows, numbered 0 through 29.// // In a for loop you need to use the row ID 0 - 29 not 1 - 30int nRow;int nTotalRows = Get2DARowCount("racialtypes"); // 30for(nRow = 0; nRow < nTotalRows; nRow++){ // nRow goes from 0 to 29 as needed}
#### See Also
functions:  |  Get2DAString Get2DAColumn
