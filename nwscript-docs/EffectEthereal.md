<!-- Source: https://nwnlexicon.com/index.php/EffectEthereal -->

# EffectEthereal()
Creates an effect like the Sanctuary spell, but the observers get no saving throw. 
effect EffectEthereal();
#### Description
Returns an effect of type EFFECT_TYPE_ETHEREAL. This effect works just like EffectSanctuary, but the observers receive no Will saving throw and the target this effect is applied to appears ethereal. 
Etherealness is cancelled as invisibility is - when you perform a hostile action or it runs out naturally. An AOE dispel can also remove it, of course. 
he target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
1.64 seems to introduce True seeing as allowing you to see ethereal creature - but not target them. This is changed from previous patches - it isn't all dominating, and counters can be taken against the creatures (immunity to targeted spells is a great benefit however). 
No normal spot, listen, or other types of non-trueseeing effects work against the Etherealness effect still. 
As with Invisibility, this should give the attacker (who has Etherealness) a +4 attack against an unaware opponent. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This is essentially a copy of EffectSanctuary with all the caveats and bugs of that effect. Please see that page and assume the saving throw has failed. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 8, CREATURE_INVISIBLE_TYPE_SANCTUARY | Likely not used by the game.   
1 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
2 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
3 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nDifficultyClass | Always 0.   
5 | bSavingThrow | Should always be 0 (FALSE) since the ethereal effect has no saving throw attached.   
#### Known Bugs
At some point, EffectEthereal did not appear to create an effect of type EFFECT_TYPE_ETHEREAL but one of EFFECT_TYPE_SANCTUARY. However this has been fixed. 
All the bugs of EffectSanctuary apply to this effect. 
#### Version
1.64 
#### Example
void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eEthereal = EffectEthereal(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eEthereal, oTarget);}
#### See Also
functions:  |   EffectSanctuary   

constants:  |   EFFECT_TYPE_* Constants
