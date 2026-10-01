<!-- Source: https://nwnlexicon.com/index.php/UnyieldingEffect -->

# UnyieldingEffect(effect)

Set the subtype of eEffect to Unyielding and return eEffect. 
effect UnyieldingEffect( effect eEffect);
#### Parameters 

eEffect
    The input effect to return an unyielding version of.
#### Description
Set the subtype of eEffect to Unyielding and return eEffect. 
Unyielding effects are not removed by resting, death or dispel magic, only by RemoveEffect(). 
Note: effects that modify state, Stunned/Knockdown/Deaf etc, WILL be removed on death. This should be the full list of these effects removed on death regardless: EffectKnockdown, EffectParalyze, EffectSleep, EffectCharmed, EffectConfused, EffectFrightened, EffectTurned, EffectDominated, EffectDazed, EffectStunned, EffectCutsceneParalyze, EffectCutsceneDominated, EffectCutsceneImmobilize, EffectEntangle, EffectPacified, EffectPetrify, EffectDeaf, EffectSilence, EffectEntangle. 
#### Remarks
Effects usually default to magical if the subtype is not set. 
Additionally while this allows persistence during death, it will not bypass effects not applying to dead creatures (which is reasonably common across effects in general) so negative effects of dying - for instance - should be applied when a creature is raised from the dead not while they are dead. 
Effect Type overview: 
Effect Type  | Duration Type  | Dispellable  | Removed by Resting  | Removed by Dying   
---|---|---|---|---  
Magical | Any | ✓ | ✓ | ✓   
Extraordinary | Any | ✖ | ✓ | ✓   
Supernatural | Temporary | ✖ | ✓ | ✓   
Supernatural | Permanent | ✖ | ✖ | ✓   
Unyielding | Any | ✖ | ✖ | ✖   
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  ExtraordinaryEffect() IgnoreEffectImmunity() SupernaturalEffect()   

constants:  |   SUBTYPE_* Constants
