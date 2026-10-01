<!-- Source: https://nwnlexicon.com/index.php/EffectNegativeLevel -->

# EffectNegativeLevel(int)

Create a Negative Level effect that will decrease the level of the target. 
effect EffectNegativeLevel( int nNumLevels, int bHPBonus=FALSE);
#### Parameters 

nNumLevels
    The number of negative levels to apply. Cannot be higher than ruleset.2da value MAX_NEGATIVE_LEVELS (100) 

bHPBonus
    See Known Bugs: It is ignored. However how it should work is: If TRUE will assign temporary hitpoints to the effect creator based on ruleset.2da value BONUS_HP_PER_LEVEL_DRAINED and nNumLevels.
#### Description
Returns a new effect object that when applied to a target will decrease their level by nNumLevels. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nNumLevels > MAX_NEGATIVE_LEVELS (default: 100). 
Negative levels can kill a creature, see Effect Breakdown below, since it acts oddly for multiclassed characters. 
General penalties applied are: 
  * EffectAttackDecrease, nNumLevels penalty, applied as ATTACK_BONUS_MISC
  * EffectSavingThrowDecrease, nNumLevels penalty to all saves
  * EffectSkillDecrease, applies 2 * nNumLevels penalty to all skills (this may be a bug)

It also affects the result from GetCasterLevel and GetSpellSaveDC, but doesn't remove spell slots or memorised spells oddly enough. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Since the loss of a level is simply a negative effect, it can be easily recovered with a restoration spell or potion. 
Level loss can also come from, apart from spells, creature weapon On Hit effects, such as a Vampires bite. 
By default, the creature On Hit negative levels are supernatural. Really, all negative levels should be permanent in this way until removed by a spell or cure (or death). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Comparison to 3E
Some of the effects make sense and others do not or are missing; negative levels usually apply: 
"An affected opponent takes a –1 penalty on all skill checks and ability checks, attack rolls, and saving throws, and loses 5 hit points and one effective level or Hit Die (whenever level is used in a die roll or calculation) for each negative level. A spellcaster loses one spell slot of the highest level of spells she can cast and (if applicable) one prepared spell of that level. If she has more than one spell at her highest level, she chooses which she loses. A psionic character loses access to one power per negative level from the highest level of power he can manifest; he also loses a number of power points equal to the cost of that power. If two or more powers fit these criteria, the manifester decides which one becomes inaccessible. This loss persists until the negative level is removed. Negative levels remain until 24 hours have passed or until they are removed with a spell, such as restoration. If a negative level is not removed before 24 hours have passed, the affected creature must attempt a Fortitude save (DC 10 + 1/2 draining creature’s racial HD + draining creature’s Cha modifier; the exact DC is given in the creature’s descriptive text). On a success, the negative level goes away with no harm to the creature. On a failure, the negative level goes away, but the creature’s level is also reduced by one. A separate saving throw is required for each negative level. 
A character with negative levels at least equal to her current level, or drained below 1st level, is instantly slain. Depending on the creature that killed her, she may rise the next night as a monster of that kind. If not, she rises as a wight. " 
The things that are applied: 
  * -1 to attack rolls
  * -1 to saving throws
  * -2 skill checks (double the penalty)
  * GetCasterLevel is reduced by 1 (this is correct)
  * GetSpellSaveDC is reduced by 1 (this is wrong)

Not present: 
  * GetHitDice/hit die/GetLevelByClass are unaffected. You can find out after application which levels (the slot) that is affected by each effect.
  * Hitpoints are unaffected - either maximum or current - but can be changed separately
  * Spell slots (memorised slots or total slots for Bards/Sorcerers) are not affected (although you can do this manually)
  * 24 hour "Save or lose real levels" effect

The simplifying of it makes some sense, however GetSpellSaveDC changing linearly is an odd choice. 
#### Effect Breakdown
This effect has a number of oddities: 
  * Death is only applied when you reach 0 or less levels in _each_ of your 3 classes. It applies to the current highest one. If you have 38/1/1 as your classes, you'd need 38 (or more) negative levels on the first class, then 1 on the second and finally 1 more on the third as at least 3 separate effects. This can cause some weirdness since you can go into negative class levels (although Caster Level seems to be capped at 0 regardless). A workaround may be to apply negative levels one at a time in a loop, although if magical effects that can be dispelled it'd play havok with EffectDispelMagicAll
  * HP does weird stuff with multiple classes, need to confirm more but when a second class in 3 classes gets it's level reduced, current HP increases (maximum HP is never affected by negative levels).
  * Skills are decreased as if EffectSkillDecrease was applied with nNumLevels was double what it is.

A characters results from GetHitDice or GetLevelByClass seem unaffected by this function. 
The characters saves, skills and attack penalties are affected properly as per their respective effects, ie some may reach caps (such as attack penalties by default being -12 at most). 
The death effect is applied instantly to the target similar to EffectDeath. You just fall over dead, no visuals are applied. 
The bonus HP being applied is bugged; see Known Bugs for details, but it seems to be pretty simple if it does get applied, although with little control: 
  * Creator of the effect will get an EffectTemporaryHitpoints(BONUS_HP_PER_LEVEL_DRAINED * nNumLevels) - BONUS_HP_PER_LEVEL_DRAINED is in ruleset.2da and defaults to 5.
  * The effect has a temporary duration of 6.0 * GetHitDice(oCreator). This duration cannot be altered.
  * The subtype is 0, or "Not assigned", so cannot be dispelled (need to test resting etc.)
  * The creator is set to be OBJECT_INVALID
  * The caster level is not set, so defaults to 0
  * There is no spell ID assigned and nothing is copied from the "original" spell (eg; Energy Drain)

nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nNumLevels | Number of "negative levels" applied   
1 | bHPBonus when created Class Slot Affected when applied  | Whether or not the HP bonus is applied when the effect is created. It then sets it to be the class slot affected by the negative levels when the effect is fully applied. It makes the nHPBonus number ignored, see Known Bugs. Class slots are 0 indexed (0, 1, 2), so value 0 here is equivalent to GetClassByPosition(1) and value 2 equivalent to GetClassByPosition(3).   
#### Known Bugs
Possibly not a bug as such; the skills decrease appears to be doubled for unknown reasons - possibly to simulate the amount of bonus skill points granted every level so may be intentional? 
Negative levels can make a class level "negative" on a mutli-class caster (so "over apply" the effects). This means before dying you could be -4 in a class level. Applying individual EffectNegativeLevel(1) at a time can help alleviate this issue. 
GetSpellSaveDC is affected by this on a 1:1 basis, which is probably intentional, but can very quickly on a higher level spellcaster make the saving throw DC negative. 
bHPBonus is bugged, due to how the code works, it is essentially ignored; when the effect is fully applied the class slot affected will be set in GetEffectInteger(eNegativeLevel, 1). This means if the negative levels affect slot 0 (which is most of the time, the primary character class slot) then no temp HP will be applied. If however it is slot 2 or 3 it will apply temporary HP. A Fighter 8 / Paladin 6 / Champion of Torm 21 will affect the third class first, meaning temp HP gets applied, but a Druid 40, or Sorcerer 38/Paladin 1/Monk 1 will not. This likely affects the On Hit: Monster property too. 
#### Version
1.62 
#### Example
// Sample code for applying 3 negative levels to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDrain = EffectNegativeLevel(3); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_NEGATIVE_ENERGY); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDrain, oTarget);}
#### See Also
constants:  |   EFFECT_TYPE_* Constants
