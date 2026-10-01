<!-- Source: https://nwnlexicon.com/index.php/CassowarySuggestValue -->

# CassowarySuggestValue(cassowary, string, float, float)
Suggest a value to the given cassowary. 
cassowary CassowarySuggestValue( cassowary cSolver, string sVarName, float fValue, float fStrength = CASSOWARY_STRENGTH_STRONG);
#### Parameters 

cSolver
    The cassowary to constrain 

sVarName
    Variable name 

fValue
    Value to suggest 

fStrength
    The strength of this constraint. It can be a float value between CASSOWARY_STRENGTH_WEAK (1.0) and CASSOWARY_STRENGTH_REQUIRED (1001001000.0). (default: CASSOWARY_STRENGTH_STRONG)
#### Description
Suggest a value to the solver. 
Edit variables are soft constraints and exist as an optimisation for complex systems. You can do the same with CassowaryConstrain("v == 5", CASSOWARY_STRENGTH_xxx); but edit variables allow you to suggest values without having to rebuild the solver. 
fStrength must be >= CASSOWARY_STRENGTH_WEAK && < CASSOWARY_STRENGTH_REQUIRED Suggested values cannot be required, as suggesting a value must not invalidate the solver. 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetLocalCassowary, SetLocalCassowary, DeleteLocalCassowary, CassowaryReset, CassowaryConstrain, CassowaryGetValue, CassowaryDebug  

constants:  |  CASSOWARY_STRENGTH_*
