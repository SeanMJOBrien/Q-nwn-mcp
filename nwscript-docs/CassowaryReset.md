<!-- Source: https://nwnlexicon.com/index.php?title=CassowaryReset&amp;action=history -->

# CassowaryReset(cassowary)
Clears a cassowarys state. 
cassowary CassowaryReset( cassowary cSolver);
#### Parameters 

cSolver
    The cassowary to reset
#### Description
Clear out this solver, removing all state, constraints and suggestions. 
This is provided as a convenience if you wish to reuse a cassowary variable. 
It is not necessary to call this for solvers you simply want to let go out of scope. 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetLocalCassowary, SetLocalCassowary, DeleteLocalCassowary, CassowaryConstrain, CassowarySuggestValue, CassowaryGetValue, CassowaryDebug
