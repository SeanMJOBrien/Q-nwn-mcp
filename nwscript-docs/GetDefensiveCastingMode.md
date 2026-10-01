<!-- Source: https://nwnlexicon.com/index.php/GetDefensiveCastingMode -->

# GetDefensiveCastingMode

# GetDefensiveCastingMode(object)
Retrieves the defensive casting mode status of a creature. 
int GetDefensiveCastingMode( object oCreature);
#### Parameters
_oCreature_
Create to determine the DEFENSIVE_CASTING_MODE_* status of. 
#### Description
Returns DEFENSIVE_CASTING_MODE_* value to reflect how the creature is currently casting spells. When DEFENSIVE_CASTING_MODE_DISABLED, the creature will suffer attacks of opportunity when casting a spell in another creature's threat range. 
#### Remarks
Only two values exist: DEFENSIVE_CASTING_MODE_ACTIVATED and DEFENSIVE_CASTING_MODE_DISABLED 
#### Version
1.30 
#### See Also
constants:  |   DEFENSIVE_CASTING_MODE_* Constants
