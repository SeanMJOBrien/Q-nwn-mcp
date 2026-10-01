<!-- Source: https://nwnlexicon.com/index.php/ExtraordinaryEffect -->

# ExtraordinaryEffect(effect)
Marks an effect as belonging to the effect subtype Extraordinary. 
effect ExtraordinaryEffect( effect eEffect);
#### Parameters 

eEffect
    An effect to flag as extraordinary.
#### Description
This function adds the flag SUBTYPE_EXTRAORDINARY to an effect, marking it as an Extraordinary effect. This allows the engine to apply the effect with the same rules as Extraordinary Abilities (3rd edition DMG page 71, MM page 7). 
Extraordinary effects cannot be dispelled, but are removed when resting. 
If you put a EffectLinkEffects link of effects as eEffect, then the entire link and all the effects within it are made extraordinary. You cannot "partially" make linked effects extraordinary. You must run it on the final linked effect chain. 
You cannot change existing effect's subtypes with this function, only ones you have created via. the "effect" declaration. 
#### Remarks
Tests have determined ExtraodinaryEffect makes sure the effect cannot be dispelled, but resting still removes it. Things such as a Barbarians Rage, which of course is not a spell, are made Extraordinary. 
Even though extraordinary effects cannot be dispelled by the standard spells (EffectDispelMagicBest or EffectDispelMagicAll), they can be dispelled by other means. 
For example: the Barbarian's Rage not only applies beneficial effects (+4 STR, +4 CON, +2 bonus on all will saves), but also a negative effect (-2 AC). This enables the restoration spell series (Lesser Restoration, Restoration, Greater Restoration) to remove the Barbarian's Rage. The description of Lesser Restoration reads:      "Removes all magical, extraordinary, and supernatural effects that apply a penalty to ability scores, AC, attack and damage rolls, spell resistance, and saving throws. Will not remove the effects of a curse or a disease."
The Barbarian's Rage actually consists of four different effects (STR +2, CON+2, will +2, AC -2) linked together via multiple EffectLinkEffects. Since the AC -2 can be removed with restoration spells, the three other effects are removed as well. This actually is very useful, otherwise the barbarian could enter his rage and remove the AC -2 penalty by drinking a simple Potion of Lesser Restoration, while still benefiting from the other effects. You should keep that in mind when scripting custom effects that apply both beneficial and negative effects at once. 
Another special behavior you should keep in mind when creating custom effects: even EffectCurse effects can be removed with restoration spells, when linked to other negative, non-curse effects. All the effects applied through the script below can be removed at once by drinking a single Potion of Lesser Restoration. And, of course, it doesn't matter whether the effect is a supernatural one or an extraordinary one. See the example for an effect of this. 
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
// while scripting a Pixie's arrows, you might find:effect eSleep = ExtraordinaryEffect(EffectSleep());// Apply two negative effects and one positive. Even though one// of the negative effects is an EffectCurse, it still can be// removed via restoration spells because it is linked to // another negative non-curse effect.void main(){ // reduce STR by two; it's a Curse! effect eNegative1 = EffectCurse(2,0,0,0,0,0); // reduce CON by two; no curse effect eNegative2 = EffectAbilityDecrease(ABILITY_CONSTITUTION, 2); // increase DEX by two effect ePositive1 = EffectAbilityIncrease(ABILITY_DEXTERITY, 2); // link the effects together effect eLink = EffectLinkEffects(eNegative2, eNegative1); eLink = ExtraordinaryEffect(EffectLinkEffects(ePositive1, eLink)); // apply them ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, GetFirstPC());}
#### See Also
functions:  |   SupernaturalEffect   

constants:  |   SUBTYPE_* Constants
