<!-- Source: https://nwnlexicon.com/index.php/SetLocalString -->

# SetLocalString

# SetLocalString(object, string, string)
Store a string as a local variable within an object. 
void SetLocalString( object oObject, string sVarName, string sValue);
#### Parameters
_oObject_
Target object to store local variable in. 
_sVarName_
Unique variable name. 
_sValue_
Variable being stored in local object. 
#### Description
Stores sValue as a local string within oObject using the variable name sVarName. The parameter sVarName is a unique string identifying a single local variable. Using the same value for sVarName in subsequent calls will overwrite the original value. 
#### Remarks
Caution should be used when setting a string on an object that has just been created. Instead of just using SetLocalString(object, string, string), one should use ActionDoCommand(SetLocalString(object, string, string)) to force the command to be added to the created creature's action queue. This ensures the string will be set, even on a freshly created object. Speculation suggests that this problem occurs because the "spawning initialization process" is still finishing on a newly created object, and it is difficult to determine exactly when "spawning initialization process" will complete. Alternatively, whenever possible, set the local variable directly on the creature in the Toolset (available since version 1.59). As with all locals, there seems to be no size limit to sVarName, however, anything over 50 characters is probably a bit extreme. 
#### Known Bugs
None (see Discussion) 
#### Version
1.61 
#### Example
// sets a string to OBJECT_SELF which can be later retrieved// using something similar to:// string sValue = GetLocalString(OBJECT_SELF, "foo");void main(){ object oThis = OBJECT_SELF; string sKey = "foo"; string sValue = "some string"; SetLocalString(oThis, sKey, sValue);}
#### See Also
functions:  |   SetLocalArrayString
