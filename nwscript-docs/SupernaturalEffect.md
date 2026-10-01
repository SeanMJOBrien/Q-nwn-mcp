<!-- Source: https://nwnlexicon.com/index.php/SupernaturalEffect -->

# SupernaturalEffect(effect)
Modifies an effect to make it a Supernatural effect. 
effect SupernaturalEffect( effect eEffect);
#### Parameters 

eEffect
    An effect to categorize as being SUBTYPE_SUPERNATURAL.
#### Description
Sets the subtype of eEffect to SUBTYPE_SUPERNATURAL and returns the modified eEffect, now a Supernatural effect. This allows the engine to apply the effect with the same rules as Supernatural Abilities (3rd edition DMG page 71, MM page 7). 
Permanent supernatural effects aren't removed by resting, and cannot be dispelled. They are still lost by dying. 
Temporary supernatural effects are removed by resting and dying, but cannot be dispelled. 
An additional bonus of this is that EffectDeath() will bypass IMMUNITY_TYPE_DEATH (eg: SupernaturalEffect(EffectDeath()), which is used on mind-based death spells such as Weird or Phantasmal Killer. 
If you put a EffectLinkEffects link of effects as eEffect, then the entire link and all the effects within it are made supernatural. You cannot "partially" make linked effects supernatural. You must run it on the final linked effect chain. 
You cannot change existing effect's subtypes with this function, only ones you have created via. the "effect" declaration. 
#### Remarks
The extent to which the Aurora Engine follows the 3rd Edition rules for Supernatural effects and abilities are not fully measured. 
However, tests by Jasperre leave little room for doubt that any permanent supernatural effects are: 
  * Undispellable
  * Cannot be removed by resting

Permanent monster abilities will be Supernatural, especially ones used on other beings, such as Curses, Ability Drain and Level Drain (sometimes applied from On Hit effects). 
Temporary Supernatural effects are much rarer, and are removed from resting, but cannot be dispelled. 
Magical effects can be dispelled and removed by resting, and extraordinary effects can only be removed by resting. 
Effect Type overview: 
Effect Type  | Duration Type  | Dispellable  | Removed by Resting  | Removed by Dying   
---|---|---|---|---  
Magical | Any | ✓ | ✓ | ✓   
Extraordinary | Any | ✖ | ✓ | ✓   
Supernatural | Temporary | ✖ | ✓ | ✓   
Supernatural | Permanent | ✖ | ✖ | ✓   
Unyielding | Any | ✖ | ✖ | ✖   
#### Version
1.61 
#### Example
// Decrease entering PC's strength by 1 as a supernatural effect.void main(){ object oPC=GetEnteringObject(); if((oPC)) return; effect eBad=EffectAbilityDecrease(ABILITY_STRENGTH, 1); eBad=SupernaturalEffect(eBad); ApplyEffectToObject(DURATION_TYPE_PERMANENT, eBad, oPC);}
#### See Also
functions:  |   MagicalEffect  ExtraordinaryEffect  

constants:  |   SUBTYPE_* Constants
