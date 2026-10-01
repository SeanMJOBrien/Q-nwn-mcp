<!-- Source: https://nwnlexicon.com/index.php/DeleteLocalCassowary -->

# DeleteLocalCassowary(object, string)
Deletes an objects stored cassowary reference by variable name. 
cassowary DeleteLocalCassowary( object oObject, string sVarName);
#### Parameters 

oObject
    The object to delete a cassowary reference on 

sVarName
    The variable name the cassowary reference to be deleted is stored under
#### Description
Delete local solver reference. 
NB: cassowary types are references, same as objects. 
Unlike scalars such as int and string, solver references share the same data. 
Modifications made to one reference are reflected on others. 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetLocalCassowary, SetLocalCassowary, CassowaryReset, CassowaryConstrain, CassowarySuggestValue, CassowaryGetValue, CassowaryDebug
