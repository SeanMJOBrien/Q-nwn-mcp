<!-- Source: https://nwnlexicon.com/index.php/GetActionMode -->

# GetActionMode(object, int)

Check if a creature is using a given action mode. 
int GetActionMode( object oCreature, int nMode);
#### Parameters 

oCreature
    Creature to examine 

nMode
    Action mode to check.  ACTION_MODE_*  or 12 for Defensive Stance (see **Known Bugs**)
#### Description
Gets the status of ACTION_MODE_* modes on a creature. As noted in Known Bugs the value 12 is valid and relates to Defensive Stance. 
#### Remarks
Use the corresponding SetActionMode if the mode needs to be turned on/off. 
Notably only Stealth and Detect modes can be on at the same time as any one of the others, which are considered combat modes and so you can't have ACTION_MODE_FLURRY on at the same time as ACTION_MODE_POWER_ATTACK. Setting one cancels the other. 
These 3 older functions: 
  * GetDetectMode
  * GetDefensiveCastingMode
  * GetStealthMode

Still work fine and are just very specific versions of this more general function. 
Note that on the start of each OnCombatRoundEnd event the AI will have all combat action modes disabled. 
#### Version
1.61 
#### Known Bugs
The constant ACTION_MODE_DEFENSIVE_STANCE - value 12 - is missing from nwscript.nss making it non-obvious how to check for such a mode being active. It works perfectly fine with the function however. 
#### Example
// Make PC exit stealth mode if currently stealthy and entering this trigger or areavoid main(){ object oPC = GetEnteringObject(); if(GetActionMode(oPC, ACTION_MODE_STEALTH) == TRUE) SetActionMode(oPC, ACTION_MODE_STEALTH, FALSE);}
#### See Also
functions:  |   SetActionMode   

constants:  |   ACTION_MODE_* Constants
