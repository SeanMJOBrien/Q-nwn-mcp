<!-- Source: https://nwnlexicon.com/index.php/GetLocalObject -->

# GetLocalObject(object, string)
Get the data describing an object stored on an object. 
object GetLocalObject( object oObject, string sVarName);
#### Parameters 

oObject
    The object that stores the object. 

sVarName
    The variable name of the data.
#### Description
Returns data contained inside the variable sVarName stored on the object oObject. oObject can be any object in the game world. 
The returned object is not validated as existing, and **must** be checked with GetIsObjectValid instead of a comparison to OBJECT_INVALID. 
The string describing the variable can also be any string in theory but it is suggested that you avoid using the NW_* tags as they tend to be used within the game already. This function must be used in conjunction with its counterpart function SetLocalObject, as this is the main way to adjust the values held in the variable sVarName. On error the function will return OBJECT_INVALID. 
#### Remarks
This is most useful for getting any object (be it an inventory item, a creature, or even just some placeable), for use later. Of course, the value set is exactly object X, and no other, so the use of SetLocalString to set the objects tag for the use of GetObjectByTag() may be preferable in some situations. 
Remember to not use this for persistent storage of variables on a PC's inventory items over server resets, as local objects will probably always return the wrong value, or OBJECT_INVALID. Instead use the SQLite functionality now included in the game for variable storage. 
#### Version
1.22 
#### Example
// This will send the PC to the object stored in "Data"void main(){ object a = GetLocalObject(OBJECT_SELF,"Data"); AssignCommand(GetFirstPC(),ActionMoveToObject(a,TRUE,1.0));}
#### See Also
functions:  |   SetLocalObject
