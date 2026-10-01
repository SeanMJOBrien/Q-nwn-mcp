<!-- Source: https://nwnlexicon.com/index.php/IgnoreEffectImmunity -->

# IgnoreEffectImmunity(effect)

Set eEffect to ignore immunities and return eEffect. 
effect IgnoreEffectImmunity( effect eEffect);
#### Parameters 

eEffect
    The input effect to modify to ignore immunity effetcs.
#### Description
Set eEffect to ignore immunities and return eEffect. 
This be applied after effects are linked with EffectLinkEffects meaning all effects in the link ignore immunities. The best way to have "Some effects are applied, but the rest all apply" is to simply remove ones you don't want from the link (eg by checking prereqs of the targets immunities beforehand - eg; if you want to always apply an ability decrease effect, but only apply a AC decrease effect if they're not immune to it, use GetIsImmune with IMMUNITY_TYPE_AC_DECREASE and don't add the AC decrease to the link at all if they're immune). 
#### Remarks
Generally this will mean you can bypass EffectImmunity type immunities (also from item properties). It will not bypass the plot or immortal flags (see page for what these affect) although the flags can be removed, effect applied, and added back if you need to force the effects onto them. 
It won't bypass cases such as EffectCharmed not working on creatures who are associates of another creature, or EffectDominated not affecting PC associates and other internal engine logic around some effects. 
EffectDamage also will bypass EffectDamageImmunityIncrease (and actually bypass decreases as well not doing the check at all) although will not bypass EffectDamageResistance or EffectDamageReduction although the latter can by bypassed by the power of the damage effect. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
// Death effect ignores death immunityeffect eDeath = IgnoreEffectImmunity(EffectDeath());// The given link adds +6 strength and immunity to ability decrease, but also always applies the -6 dexterity even though they'd be immune if IgnoreEffectImmunity is not applied.// We do this to the entire link as noted above.effect eLink = IgnoreEffectImmunity(EffectLinkEffects(EffectImmunity(IMMUNITY_TYPE_ABILITY_DECREASE), EffectLinkEffects(EffectAbilityIncrease(ABILITY_STRENGTH, 6), EffectAbilityDecrease(ABILITY_DEXTERITY, 6)));
#### See Also
functions:  |  ExtraordinaryEffect() SupernaturalEffect() UnyieldingEffect()
