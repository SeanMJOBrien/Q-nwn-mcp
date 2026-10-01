<!-- Source: https://nwnlexicon.com/index.php/GetLevelByClass -->

# GetLevelByClass

# GetLevelByClass(int, object)
Get the level of an object in a given class. 
int GetLevelByClass( int nClassType, object oCreature = OBJECT_SELF);
#### Parameters
_nClassType_
The class to check for using CLASS_TYPE_* constants. 
_oCreature_
The object to check for the class. (Default: OBJECT_SELF) 
#### Description
Returns an integer that describes the level of oCreature in the class described by CLASS_TYPE_*. Integers from 1 to 20 indicate levels in the class. A value of 0 indicates the absence of a level in the class. For example, a placeable chair object has no classes, so for any requests 0 will be returned. 
#### Version
1.22 
#### Example
// Determins the PC level in the class PALADIN (CLASS_TYPE_PALADIN)void main(){ int i; i = GetLevelByClass(CLASS_TYPE_PALADIN,GetFirstPC()); SendMessageToPC(GetFirstPC(),"Your Level in Paladin == " + IntToString(i));}
#### See Also
functions:  |   GetLevelByPosition   

constants:  |   CLASS_TYPE_* Constants
