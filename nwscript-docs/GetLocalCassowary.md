<!-- Source: https://nwnlexicon.com/index.php?title=GetLocalCassowary&amp;action=history -->

# GetLocalCassowary(object, string)
Gets an objects stored cassowary reference by variable name. 
cassowary GetLocalCassowary( object oObject, string sVarName);
#### Parameters 

oObject
    The object to retrieve a cassowary from 

sVarName
    The variable name the cassowary is stored under
#### Description
Get oObject's local cassowary variable reference sVarName 
Return value on error: empty solver 
NB: cassowary types are references, same as objects. 
Unlike scalars such as int and string, solver references share the same data. 
Modifications made to one reference are reflected on others. 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
#### See Also
functions:  |  SetLocalCassowary, DeleteLocalCassowary, CassowaryReset, CassowaryConstrain, CassowarySuggestValue, CassowaryGetValue, CassowaryDebug
