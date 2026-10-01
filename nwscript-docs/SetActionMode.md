<!-- Source: https://nwnlexicon.com/index.php/SetActionMode -->

# SetActionMode(object, int, int)

Sets the status of an action mode on a creature. 
void SetActionMode( object oCreature, int nMode, int nStatus);
#### Parameters 

oCreature
    Creature to set the action mode on 

nMode
     ACTION_MODE_*  to set, or 12 for Defensive Stance which works perfectly fine (see also **Description** and **Known Bugs**) 

nStatus
    TRUE or FALSE
#### Description
Sets the status of modes ACTION_MODE_* on a creature. 
On the AI any combat action mode (ie not detect or stealth) is cancelled just prior to the OnCombatRoundEnd script firing. If you want to keep using Parry, or keep using Counter Spell, make sure to re-enable it in that script again. 
As noted in Known Bugs you can use value 12 for Defensive Stance which works perfectly fine with this function. Defensive Stance being activated removes a feat usage every time it is set. Also due to the above known issue that AI creatures have all combat modes removed each OnCombatRoundEnd firing, it will not keep Defensive Stance on losing the feat usage entirely. Work around this with IncrementRemainingFeatUses before setting this combat mode again. 
#### Remarks
Stealth and Detect modes can be enabled independently of the others which are considered combat modes and can only have one at a time (enabling a new one disables the old one). 
There are some older functions that do this in a less generic way for AI's: 
  * ActionUseSkill can be used to enable stealth and search/detect modes
  * ActionUseFeat can be used to turn on a mode and add an attack action if an enemy is specified for most combat modes (Eg; FEAT_POWER_ATTACK). This is more limiting though since you can't, for instance, combine Knockdown with Power Attack or Dwarf Defensive Stance with Called Shot or similar.

You also need consider two of the modes require special things to occur: 
  * ActionCounterSpell is required for ACTION_MODE_COUNTERSPELL since it requires a target, you can't just use SetActionMode.
  * ACTION_MODE_PARRY really needs you to be attacking an enemy (else the mode just stops) therefore combine it with at least one ActionAttack.

#### Version
1.61 
#### Known Bugs
On the AI all combat modes are cancelled just prior to each OnCombatRoundEnd script firing. 
The constant ACTION_MODE_DEFENSIVE_STANCE - value 12 - is missing from nwscript.nss making it non-obvious how to set such a mode to be active. It does otherwise work as intended. 
On top of this it appears all combat modes are cleared each OnCombatRoundEnd firing for an AI so you can only sit in one place correctly having the Defensive Stance active if you use IncrementRemainingFeatUses. 
#### Example
// Make PC exit stealth mode if currently stealthy and entering this trigger or areavoid main(){ object oPC = GetEnteringObject(); if(GetActionMode(oPC, ACTION_MODE_STEALTH) == TRUE) SetActionMode(oPC, ACTION_MODE_STEALTH, FALSE);}
#### See Also
functions:  |   GetActionMode   

constants:  |   ACTION_MODE_* Constants
