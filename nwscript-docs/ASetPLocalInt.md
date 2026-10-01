<!-- Source: https://nwnlexicon.com/index.php/ASetPLocalInt -->

# aSetPLocalInt(object, string, int)
Sets a local integer on each of the party members. 
void aSetPLocalInt( object oPC, string sLocalName, int nValue);

### Parameters 

oPC
    The PC or a member of the PC's party. 

sLocalName
    Name of the variable to be stored. 

nValue
    Value of the integer variable to be stored.
### Description
This function sets a local variable named sLocalName to nValue on each of the players that are in oPC's party. This function essentially performs a SetLocalInt(object, string, int) on each member of the party. 
### Remarks
Found in nw_j_assassin.nss, and used to make plots more multi-player friendly. 
### Requirements
#include "nw_j_assassin" 
### Version
1.28 
### See Also
functions:  | SetPLocalInt, aGetPLocalInt
