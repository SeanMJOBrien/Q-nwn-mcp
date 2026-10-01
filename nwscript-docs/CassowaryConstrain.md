<!-- Source: https://nwnlexicon.com/index.php?title=CassowaryConstrain&amp;action=history -->

# CassowaryConstrain(cassowary, string, float)
Add a constraint to a cassowary. 
cassowary CassowaryConstrain( cassowary cSolver, string sConstraint, float fStrength = CASSOWARY_STRENGTH_REQUIRED);
#### Parameters 

cSolver
    The cassowary to constrain 

sConstraint
    A constraint for the solver 

fStrength
    The strength of this constraint. It can be a float value between CASSOWARY_STRENGTH_WEAK (1.0) and CASSOWARY_STRENGTH_REQUIRED (1001001000.0). (default: CASSOWARY_STRENGTH_REQUIRED)
#### Description
Add a constraint to the system. 
The constraint needs to be a valid comparison equation, one of: >=, ==, <=. 
This implementation is a linear constraint solver. 
You cannot multiply or divide variables and expressions with each other. Doing so will result in a error when attempting to add the constraint. (You can, of course, multiply or divide by constants). 
fStrength must be >= CASSOWARY_STRENGTH_WEAK && <= CASSOWARY_STRENGTH_REQUIRED. 
Any referenced variables can be retrieved with CassowaryGetValue. 
Returns "" on success, or the parser/constraint system error message. 
#### Remarks
If you're not sure what a cassowary is, it's not the bird but instead a type of solver). NWN uses them internally to resize the newer GUI windows. You can use them to do solving by inputting data in, and ask it to give you data out. 
There is no reason to define a constraint variable before use, in fact doing so is an improper use of the function. 
While it is happy to accept integers (eg: "right == left + 10") it essentially uses floats for all variables inside the solver and what you get out with CassowaryGetValue. 
To reset the cassowary use CassowaryReset. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
This function was updated in 1.84.8193.29 of NWN:EE. Fixed a crash when calling AddConstraint with invalid math formula. #293 
#### Example
#### See Also
functions:  |  GetLocalCassowary, SetLocalCassowary, DeleteLocalCassowary, CassowaryReset, CassowarySuggestValue, CassowaryGetValue, CassowaryDebug  

constants:  |  CASSOWARY_STRENGTH_*
