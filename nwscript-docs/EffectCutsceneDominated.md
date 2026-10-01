<!-- Source: https://nwnlexicon.com/index.php/EffectCutsceneDominated -->

# EffectCutsceneDominated()
Creates an effect that is guaranteed to dominate a creature. 
effect EffectCutsceneDominated();
#### Description
Creates an effect that is guaranteed to dominate a creature, similar to EffectDominated, but cannot be resisted. 
See EffectDominated for Code sample, more remarks and description. 
#### Remarks
This is useful for bypassing a person's mind immunity which is common among many NwN items, although it is rarely needed now, because of newer cutscene functions. 
A nice application of this is that more then 1 dominated person can be added to a party, or faction, while EffectDominated only affects one person - and if a new one is targeted, the old one is released from its effects. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
Note that creature should not be immortal to be dominated. Use SetImmortal to set it to false if you need to do it programmatically. 
#### Effect Breakdown
The effect is a complex effect of CREATURE_STATE_CSDOMINATED (value 28). 
See EffectDominated for pretty much the entire breakdown and all the associated weird and wacky behaviour, it has these exceptions however: 
  * Immunities of all kind are ignored
  * The effect creator can have more than one dominated creature
  * It has a GetEffectType of EFFECT_TYPE_INVALIDEFFECT although you can test the GetEffectInteger value at least.

nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | Always 28, CREATURE_STATE_CSDOMINATED |   
#### Known Bugs
There is no EFFECT_TYPE_* constant for this effect, it returns EFFECT_TYPE_INVALIDEFFECT. 
#### Version
1.62 
#### Example
// See EffectDominated for code sample for this.
#### See Also
functions:  |   EffectDominated
