<!-- Source: https://nwnlexicon.com/index.php/BashDoorCheck -->

# BashDoorCheck(object)
Used in DetermineCombatRound() to keep a henchmen bashing doors. 
int BashDoorCheck( object oIntruder = OBJECT_INVALID);

### Parameters 

oIntruder
    (Default: OBJECT_INVALID)
### Description
This check is made in DetermineCombatRound() to keep henchmen bashing doors unless there are bad guys in the area. 
### Remarks
Unless you're rewriting DetermineCombatRound() for your own custom AI, you are unlikely to need this function. 
### Requirements
#include "nw_i0_generic" 
### Version
1.22 
### Example
// From the header to nw_i0_generic:/* ******************************************** WARNING THIS SCRIPT IS CHANGED AT YOUR PERIL ******************************************** This is the master generic script and currently handles all combat and some plot behavior within NWN. If this script is tampered with there is a chance of introducing game breaking bugs. But other than that enjoy.*/// If you're confident that using or modifying BashDoorCheck// is the right thing to do, you don't need sample code.
### See Also
functions:  | DetermineCombatRound
