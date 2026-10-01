<!-- Source: https://nwnlexicon.com/index.php/GetModule -->

# GetModule

# GetModule()
Gets the object describing the module. 
object GetModule();
#### Description
Returns the module object. On error will return OBJECT_INVALID. Used with GetLocal* and SetLocal* functions for creating global (module-level) variables. 
#### Remarks
If there is a return of OBJECT_INVALID then that would mean that the game has crashed wouldn't it? I haven't been able to test this. 
#### Version
1.22 
#### Example
// sends the tag of the module to the first PCvoid main(){ SendMessageToPC(GetFirstPC(),GetTag(GetModule()));}
#### See Also
functions:  |   GetModuleName
