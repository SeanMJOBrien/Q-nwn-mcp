<!-- Source: https://nwnlexicon.com/index.php/EffectDispelMagicAll -->

# EffectDispelMagicAll(int)
Create a Dispel Magic All effect. 
effect EffectDispelMagicAll( int nCasterLevel = USE_CREATURE_LEVEL);
#### Parameters 

nCasterLevel
    The caster level of the dispeller (OBJECT_SELF). If no parameter is specified, USE_CREATURE_LEVEL will be used. This will cause the dispel effect to use the level of the creature that created the effect.
#### Description
Returns a new effect object that when applied to a target will attempt to dispel each and every magical effect on the target. Spells which apply two separate unlinked effects (such as Aid, which applies temporary HP separately) can have odd cases where half the spell's effects are dispelled. 
Dispel magic checks are d20 + nCasterLevel, versus each spell's effects (good or bad) on the target. The DC is 11 + the effects caster level. The DC is 11 + the effects caster level. Therefore, lesser dispel with a maximum caster bonus of +5 (maximum roll 25), could never dispel anything cast by a level 15 mage (total DC 26). 
For instance if you've cast Stoneskin as a level 10 Wizard on yourself, and your level 5 Cleric ally has also cast Bless, the checks are done for each of the 2 spells against a DC of 21 and DC of 16 respectively. 
The target this effect is applied to must be an object capable of having effects applied to it for it to work (a creature, placeable or door usually). This effect can only be applied instantly. 
#### Remarks
Supernatural, Extraordinary and Unyielding subtype effects can never be dispelled. Nor can "engine effects" (subtype 0, used for taunt, knockdown, called shot, crippling strike, etc.). 
It should know, by the use of Linking effects, what are separate effects from different castings of the spells - such as someone having sets of Bless cast on them. 
Also, it is likely not important who the creator of the effect is, except for the messages displayed - there is no way to set an effect so it cannot be dispelled by race, alignment or level. 
You can detect when an effect chain is removed using EffectRunScript, since you can set a variable before running dispel magic and then remove it shortly after (say 0.1 seconds later). You can also detect which effects were removed after this is run with a two loops before and after and seeing what has changed (tracking with GetEffectLinkId may be easiest). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare effects, and apply them using an ApplyEffectToObject Command. See the Effect tutorial for more details. 
#### Effect Breakdown
This is applied instantly so it is reasonably simple. 
As above the effects all store a caster level (you can find this number yourself with GetEffectCasterLevel). It will iterate over each effect which is magical and test nCasterLevel against the given effect with a 1d20 roll added on versus 11 + caster level on the effect. If the roll is successful RemoveEffect is used on the effect (removing all linked effects). 
Linked effects are only tested once, but multiple effects split up from each other are tested individually (eg; SPELL_AID will add a linked positive effect for attack increase etc., but also a second one for the temporary HP). 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nCasterLevel | Defaults to USE_CREATURE_LEVEL   
#### Version
NWN:EE corrects the check to be d20 + Caster Level against a DC of 11 + Caster Level. Equal or beating it will now properly remove effects. 
This function was updated in 1.88.8193.36 of NWN:EE. EffectDispelMagicAll(), EffectDispelMagicBest() made consistent with new caster level calculations and will always utilize stored caster level of effects. 
This function was updated in 1.87.8193.36 of NWN:EE. Fixed effect links not being retained after relogging on a server. Fixed effects incorrectly setting creator, caster level and spell ID. 
#### Example
// Sample code for applying Dispel Magic All (level 10) to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDispelAll = EffectDispelMagicAll(10); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_DISPEL); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_INSTANT, eDispelAll, oTarget);}
#### See Also
functions:  | EffectDispelMagicBest GetEffectCasterLevel GetEffectLinkId RemoveEffect
