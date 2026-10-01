<!-- Source: https://nwnlexicon.com/index.php?title=EffectDispelMagicBest&amp;action=history -->

# EffectDispelMagicBest(int)
Create a Dispel Magic Best effect. 
effect EffectDispelMagicBest( int nCasterLevel = USE_CREATURE_LEVEL);
#### Parameters 

nCasterLevel
    The caster level of the dispeller (OBJECT_SELF). If no parameter is specified, USE_CREATURE_LEVEL will be used. This will cause the dispel effect to use the level of the creature that created the effect.
#### Description
Returns a new effect object that when applied to a target will attempt to dispel the single highest "best" spell on the target. This is done by the caster level set on each effect - although an unknown order if two are equal (likely is the earliest applied). For instance if you've cast Stoneskin as a level 10 Wizard on yourself, and your level 5 Cleric ally has also cast Bless, it will consider the Stoneskin (caster level 10) the "best" and try to dispel that first, then if it fails to dispel it will attempt to dispel the Bless spell (caster level 5). 
Dispel magic checks are d20 + nCasterLevel, versus each spell's effects (good or bad) on the target, until one is passed and a spell removed. The DC is 11 + the effects caster level. Therefore, lesser dispel with a maximum caster bonus of +5 (maximum roll 25), could never dispel anything cast by a level 15 mage (total DC 26). 
This version of dispel magic is used for Area-of-effect hits. 
The target this effect is applied to must be an object capable of having effects applied to it for it to work (a creature, placeable or door usually). This effect can only be applied instantly. 
#### Remarks
Supernatural and Extraordinary and Unyielding subtype effects can never be dispelled. Nor can "engine effects" (subtype 0, used for taunt, knockdown, called shot, crippling strike, etc.). 
It should know, by the use of Linking effects, what are separate effects from different castings of the spells - such as someone having sets of Bless cast on them. 
Also, it is likely not important who the creator of the effect is, except for the messages displayed - there is no way to set an effect so it cannot be dispelled by race, alignment or level. 
You can detect when an effect chain is removed using EffectRunScript, since you can set a variable before running dispel magic and then remove it shortly after (say 0.1 seconds later). You can also detect which effects were removed after this is run with a two loops before and after and seeing what has changed (tracking with GetEffectLinkId may be easiest). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare effects, and apply them using an ApplyEffectToObject Command. See the Effect tutorial for more details. 
#### Effect Breakdown
This is applied instantly so it is reasonably simple. 
As above the effects all store a caster level (you can find this number yourself with GetEffectCasterLevel). It will iterate over each effect which is magical in the order of nCasterLevel. It then will test nCasterLevel against the given effect with a 1d20 roll added on versus 11 + caster level on the effect. If the roll is successful RemoveEffect is used on the effect (removing all linked effects). Once it removes one effect chain it will stop looping effects. 
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
// Sample code for applying Dispel Magic Best (level 10) to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDispelBest = EffectDispelMagicBest(10); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_DISPEL); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_INSTANT, eDispelBest, oTarget);}
#### See Also
functions:  | EffectDispelMagicAll GetEffectCasterLevel GetEffectLinkId RemoveEffect
