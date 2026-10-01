<!-- Source: https://nwnlexicon.com/index.php/MagicalEffect -->

# MagicalEffect

# MagicalEffect(effect)
This function sets the effects sub type to magical. 
effect MagicalEffect( effect eEffect);
#### Parameters
_eEffect_
#### Description
Effects are one of three SUBTYPE_* (EXTRAORDINARY, MAGICAL, SUPERNATURAL). This function sets the specified effects subtype to SUBTYPE_MAGICAL. Acts as a mutator for an effects subtype. Effects, by default, start as magical and there is normally no need to use this function. Magical effects can be dispelled (if applied from a spell script) and removed when resting. If you put a link of effects as eEffect, then the entire link and all the effects within it are made magical. You cannot change existing effect's subtypes with this function, only ones you have created via. the "effect" declaration. 
#### Remarks
SUBTYPTE_MAGICAL is the default subtype for all effects. See 3rd Edition DMG page 71 or MM page 7 for a description of ability classifications. 
Effect Type overview: 
Effect Type  | Duration Type  | Dispellable  | Removed by Resting  | Removed by Dying   
---|---|---|---|---  
Magical | Any | ✓ | ✓ | ✓   
Extraordinary | Any | ✖ | ✓ | ✓   
Supernatural | Temporary | ✖ | ✓ | ✓   
Supernatural | Permanent | ✖ | ✖ | ✓   
Unyielding | Any | ✖ | ✖ | ✖   
#### Version
1.62 
#### Example
void main(){ //Create a new polymorph effect. effect ePolymorph = EffectPolymorph(POLYMORPH_TYPE_PENGUIN); //Pick your target object oPC = GetFirstPC(); //Make it a magical effect ePolymorph = MagicalEffect(ePolymorph); //Apply the effect ApplyEffectToObject (DURATION_TYPE_TEMPORARY, ePolymorph, oPC, 300.0);}
#### See Also
functions:  |   SupernaturalEffect   

constants:  |   SUBTYPE_* Constants
