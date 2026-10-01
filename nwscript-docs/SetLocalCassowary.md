<!-- Source: https://nwnlexicon.com/index.php?title=SetLocalCassowary&amp;action=history -->

# SetLocalCassowary(object, string, cassowary)
Sets an objects stored cassowary reference by variable name. 
cassowary SetLocalCassowary( object oObject, string sVarName, cassowary cSolver);
#### Parameters 

oObject
    The object to store a cassowary reference on 

sVarName
    The variable name the cassowary is to be stored under 

cSolver
    The cassowary reference to store
#### Description
Set a reference to the given solver on oObject. 
NB: cassowary types are references, same as objects. 
Unlike scalars such as int and string, solver references share the same data. 
Modifications made to one reference are reflected on others. 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetLocalCassowary, DeleteLocalCassowary, CassowaryReset, CassowaryConstrain, CassowarySuggestValue, CassowaryGetValue, CassowaryDebug
