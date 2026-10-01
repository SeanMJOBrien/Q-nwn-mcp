<!-- Source: https://nwnlexicon.com/index.php/AGetPLocalInt -->

# aGetPLocalInt(object, string)
Scans through the PC's party and returns the largest value stored on a character. 
int aGetPLocalInt( object oPC, string sLocalName);

### Parameters 

oPC
    A member of the PC party. 

sLocalName
    Variable name stored on the PC.
### Description
The purpose of this function is to encapsulate the GetLocalInt function so that it treats the entire party as a single entity. The value returned is the largest value stored on ANY of the PC's party that is availible via the GetLocalInt(object, string) method. 
### Remarks
This function is useful for getting plot flags that may be stored on any PC in a party of PCs. Found in nw_j_assassin.nss, and used to make plots more multi-player friendly. Same as GetPLocalInt(object, string). 
### Requirements
#include "nw_j_assassin" 
### Version
1.28 
### See Also
functions:  |  aSetPLocalInt , GetPLocalInt
