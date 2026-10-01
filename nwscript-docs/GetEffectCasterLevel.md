<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectCasterLevel&amp;action=history -->

# GetEffectCasterLevel(effect)

Returns the caster level of the creature who created the effect. 
int GetEffectCasterLevel( effect eEffect);
### Parameters 

eEffect
    The effect object to get the caster level from.
### Description
Returns the caster level set when the effect was created as part of a spell script. 
Only works on valid spells and where GetCasterLevel returns a proper value. 
If not created by a creature, returns 0. If created by a spell-like ability, returns 0. 
### Remarks
This is used internally by EffectDispelMagicBest and EffectDispelMagicAll to remove magical effects using a dispel check on each one (removing a linked set if one is removed). 
You can now set this with SetEffectCasterLevel. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
This function was updated in 1.87.8193.36 of NWN:EE. Fixed effect links not being retained after relogging on a server. Fixed effects incorrectly setting creator, caster level and spell ID. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetCasterLevel(), GetEffectCreator(), EffectDispelMagicBest, EffectDispelMagicAll, GetEffectLinkId
