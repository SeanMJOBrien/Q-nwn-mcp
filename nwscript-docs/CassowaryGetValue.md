<!-- Source: https://nwnlexicon.com/index.php?title=CassowaryGetValue&amp;action=history -->

# CassowaryGetValue(cassowary, string)
Gets a given cassowary variable strength value. 
cassowary CassowaryGetValue( cassowary cSolver, string sVarName);
#### Parameters 

cSolver
    The cassowary to get a strength value from 

sVarName
    Variable name
#### Description
Get the value for the given variable, or 0.0 on error. 
To set a value to retrieve using this use CassowaryConstrain or CassowarySuggestValue. Strength values will be between CASSOWARY_STRENGTH_WEAK (1.0) and CASSOWARY_STRENGTH_REQUIRED (1001001000.0). 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetLocalCassowary, SetLocalCassowary, DeleteLocalCassowary, CassowaryReset, CassowaryConstrain, CassowarySuggestValue, CassowaryDebug  

constants:  |  CASSOWARY_STRENGTH_*
