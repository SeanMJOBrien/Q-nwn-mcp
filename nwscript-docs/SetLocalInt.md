<!-- Source: https://nwnlexicon.com/index.php/SetLocalInt -->

# SetLocalInt

# SetLocalInt(object, string, int)
Store a number as a local variable within an object. 
void SetLocalInt( object oObject, string sVarName, int nValue);
#### Parameters
_oObject_
Target object to store local variable in. 
_sVarName_
Unique variable name. 
_nValue_
Variable being stored in local object. 
#### Description
Stores nValue as a local number within oObject using the variable name sVarName. The parameter sVarName is a unique string identifying a single local variable. Using the same value for sVarName in subsequent calls will overwrite the original value. 
#### Remarks
There are ways of using one integer to store many variables, by basically using numbers so big they can be compared using the Bitwise Operators. See the default Bioware AI, and how they use SetSpawnInCondition(). X0_I0_SPAWNCOND holds the values and functions for this (A good example to adopt) for the SoU and HotU AI. NW_I0_GENERIC holds the same things for the NwN AI. As with all locals, there seems to be no size limit to sVarName, however, anything over 50 characters is probably a bit extreme. The definition of TRUE and FALSE sometimes is not known. For reference: TRUE = 1 FALSE = 0 Using ! before a local integer value in an if statement (EG: if(!iInt) ) will check if it is == FALSE. Using nothing before a local integer value in an if statement (EG: if(iInt) ), will check if it is != FALSE, but doesn't mean it has to be positive. 
#### Known Bugs
None. 
#### Version
1.62 
#### Example
void main(){ object oThis = OBJECT_SELF; string sKey = "foo"; int iValue = 2; // sets the value of 2 tied to the key "foo" on the caller. // this value can be later retrieved using GetLocalInt. SetLocalInt(oThis, sKey, iValue);}
#### See Also
functions:  |   SetLocalArrayInt
