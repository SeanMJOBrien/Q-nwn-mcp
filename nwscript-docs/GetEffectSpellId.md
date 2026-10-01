<!-- Source: https://nwnlexicon.com/index.php/GetEffectSpellId -->

# GetEffectSpellId

# GetEffectSpellId(effect)
This will return the constant of the spell that applied the effect (SPELL_*). 
int GetEffectSpellId( effect eSpellEffect);
#### Parameters
_eSpellEffect_
The effect that you wish to examine. 
#### Description
Returns the constant defining the Spell used to apply this effect on the creature. Will Return -1 if eSpellEffect was not applied by a spell script. 
#### Remarks
You must first create and place the effect you wish to examine into a variable before calling this function. Very useful if you are looking for all the effects of a particular spell or leaving out effects of certain spells. One example could be when you wish to dispell all effects on a creature except those granted by a wish spell. 
#### Version
1.22 
#### See Also
functions:  |   RemoveEffect
