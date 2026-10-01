<!-- Source: https://nwnlexicon.com/index.php/GetMaxHitPoints -->

# GetMaxHitPoints(object)
Get the maximum hit points (HP) of an object. 
int GetMaxHitPoints( object oObject = OBJECT_SELF);
#### Parameters 

oObject
    The object whose HP are to be returned. (Default: OBJECT_SELF)
#### Description
Returns an integer that indicates the total hit points (HP) of an object. This function will return the number 0 if an error occurs (e.g., if the object has no hit points). 
#### Remarks
Hit points attained through spell effects and similar devices are not counted. For example, assume a PC has the virtue spell applied to him or her, giving 1 extra HP--this would not be counted (e.g., with 52/52 HP normally but with virtue 53/52, the value 52 would be returned). Instead use GetCurrentHitPoints to check for bonus HP like this. 
#### Version
1.27 
#### Example
// Finds the maximum hit points for a PCvoid main(){ int i = GetMaxHitPoints(GetFirstPC()); SendMessageToPC(GetFirstPC(),IntToString(i));}
#### See Also
functions:  |  GetCurrentHitPoints  GetTotalDamageDealt
