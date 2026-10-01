<!-- Source: https://nwnlexicon.com/index.php/EffectCurse -->

# EffectCurse(int, int, int, int, int, int)
Create a Curse effect. 
effect EffectCurse( int nStrMod = 1, int nDexMod = 1, int nConMod = 1, int nIntMod = 1, int nWisMod = 1, int nChaMod = 1);
#### Parameters 

nStrMod
    strength penalty modifier (Default: 1) 

nDexMod
    dexterity penalty modifier (Default: 1) 

nConMod
    constitution penalty modifier (Default: 1) 

nIntMod
    intelligence penalty modifier (Default: 1) 

nWisMod
    wisdom penalty modifier (Default: 1) 

nChaMod
    charisma penalty modifier (Default: 1)
#### Description
Returns a new effect object that when applied to a target will reduce their ability scores by the amounts given in the parameters. 
A value of 0 means no decrease in that ability. So you can have a curse that only affects particular statistics if required. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Modifiers should be given in positive amounts, the script will apply them negatively, similar to EffectAbilityDecrease. 
Multiple applications of curse stacks and is essentially lots of ability decreases bundled up, see Effect Breakdown below for details. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This essentially creates 6 internally only accessible EffectAbilityDecrease effects, which share identical behaviour to them in regards to "stats capped at 3". This means you also can't put a negative value in to get a positive result, it caps at lowest of 1. It also means if you have IMMUNITY_TYPE_ABILITY_DECREASE at the point the curse is applied nothing happens (but the curse icon will still appear, if you lose the stat immunity nothing will happen either). 
Since it hides the ability decreases internally there is no effect icon for ability decrease, just the curse icon. 
Therefore GetEffectInteger may not truly accurately say what the decreases are - only the intended decreases not the actual ones. For instance if Strength is already at 3, and curse is meant to decrease it by 1 more, it will instead not decrease strength at all and if that strength is returned to normal it won't have any decrease applied from the curse. 
If you use **EffectCurse(0, 0, 0, 0, 0, 0);** it will still apply (unless the creature has IMMUNITY_TYPE_CURSED) but essentially do nothing to stats except have a cool icon. This can be useful perhaps for displaying the PC has a cursed item equipped or some other geas or plot related curse instead of just ability changes. 
Most curses in Bioware spells are applied as SupernaturalEffect, but they don't have to be - the effect isn't inherently defensive against EffectDispelMagicAll. Nothing other than this function EffectCurse applies curses in the engine (ie no On Hit effects) so it's entirely created by scripts. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nStrMod | Amount to reduce strength by, or 0 for no change.   
1 | nDexMod | Amount to reduce dexterity by, or 0 for no change.   
2 | nConMod | Amount to reduce constitution by, or 0 for no change.   
3 | nIntMod | Amount to reduce intelligence by, or 0 for no change.   
4 | nWisMod | Amount to reduce wisdom by, or 0 for no change.   
5 | nChaMod | Amount to reduce charisma by, or 0 for no change.   
#### Known Bugs
It shares remarks/bugs with EffectAbilityDecrease where larger ability decreases are capped, but weirdly are not if there is enough "space" before it gets to the minimum value of 3. 
#### Version
1.62 
#### Example
// Sample code for applying a Curse of 1 of every stat to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eCurse = EffectCurse(1, 1, 1, 1, 1, 1); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eCurse, oTarget);}
#### See Also
functions:  | EffectAbilityDecrease  

constants:  |  ABILITY_* Constants
