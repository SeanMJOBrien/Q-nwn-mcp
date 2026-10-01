<!-- Source: https://nwnlexicon.com/index.php/EffectSanctuary -->

# EffectSanctuary(int)
Creates a sanctuary effect. 
effect EffectSanctuary( int nDifficultyClass);
#### Parameters 

nDifficultyClass
    Difficulty of the will saving throw to pass to see the creature this effect is applied to. Must be a non-zero, positive number.
#### Description
Create a Sanctuary effect (see SPELL_SANCTUARY). 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nDifficultyClass is less than or equal to 0. 
The difficulty is the save DC in the sanctuary spell, or, to put it another way, the DC of the will save needed to see through the person's sanctuary. The save DC is done automatically for anyone who could see the person it is applied to if they didn't have the effect (IE: Line of sight to the person). 
Allies do not need to pass the save DC and see the creature automatically. 
The target this effect is applied to must be a creature for it to work. The target this effect is applied to must be a creature for it to work. 
#### Remarks
Sanctuary is especially used in the Sanctuary spell - as a form of weaker invisibility. However, sanctuary, if the save is failed against, can be more powerful - you never can perceive them (from listening nor being right next to them) as you fail to know they are there! It can get powerful if the save DC is high enough versus other creatures appropriate will saves - such as against fighters. 
Even if the save is passed you can only hear the target - although you don't get a concealment penalty of 50% only a -4 to hit apparently. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This is a complex effect with some buggy characteristics. If you ever wondered why, even after a creature passes the save, they still don't attack - that's because Bioware's AI is not able to react to only heard creatures. This means sanctuary - even if the saving throw is passed - essentially makes you invisible to the AI. 
There are two major states, having passed a save and having failed it. In addition EffectTrueSeeing is meant to pierce this and EffectEthereal but boy oh boy it's buggy. Note the saving throw is only applied once - but a second EffectSanctuary basically overrides the previous one and instigates another saving throw to be made. 
Saving throw passed: 
  * You can only hear the creature, from a really short distance (around 4M or so maximum) (this also auto-applies an engine coded vfx - VFX_DUR_INVISIBILITY - to the creature).
  * You can target the creature with ActionAttack. You cannot see them but they get no concealment bonus as if they were hidden, so only get -4 to hit.
  * You cannot, because the object is only heard, cast spells directly on the target.
  * Bizarrely EffectTrueSeeing has no additional bonuses - they stay as a partially hidden creature

Saving throw failed: 
  * Creature is now cannot be perceived by sight or hearing. In fact you can click on their location as a PC and seem to walk through where they were (although this might be a SP only thing).
  * If you have EffectTrueSeeing then the creature is visible and heard, as if they didn't have the effect, _but you cannot directly target them_ with ActionAttack, combat feats, or ActionCastSpellAtObject. Spells of course can be cast at their feet.

Note that EffectEthereal is a version of this effect since it essentially always has the "Failed" saving throw state (bSavingThrow is 0). 
When the creature does a hostile action the sanctuary effect is removed as per EffectInvisibility rules. 
Note that if you are allied to a creature who uses sanctuary, like the same party, like other invisibility effects you can always bypass them and be able to see them. 
As per below this effect like EffectInvisibility respects racial types and alignments for who to affect. Those not affected simply can always see and hear the creature as normal, no save is applied. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 8, CREATURE_INVISIBLE_TYPE_SANCTUARY | Likely not used by the game.   
1 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
2 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
3 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nDifficultyClass | The submitted DC of the will saving throw. Must be 1 or higher.   
5 | bSavingThrow | Should always be 1 (TRUE) since the sanctuary effect has a saving throw attached. EffectEthereal doesn't so it is 0 for it.   
#### Known Bugs
The fact that a creature can be not seen when the saving throw is passed is outright wrong according to the description of the relevant spell: "The caster's or the person's, touched by the caster, presence is completely ignored by nearby creatures for the duration of the spell." where "Save: Will Negates". That isn't "Save: Will Only Lets You Hear Them"! 
The other problem is True Seeing should see through it entirely and let them attack, as per the description: "The target creature can see through Sanctuary and Invisibility effects, and automatically spots hiding opponents." but again the effect is buggy - passing the save the True Seeing does nothing, while failing it is almost worse, since you can see them but cannot attack them - as if they were under the effect of EffectEthereal. 
EffectEthereal could be considered buggy in a similar fashion; as it is an identical effect with just bSavingThrow being FALSE. 
#### Version
1.62 
#### Example
// Sample code for applying sanctuary, save DC 20, to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eSanctuary = EffectSanctuary(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HEAD_HOLY); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eSanctuary, oTarget);}
#### See Also
functions:  |   EffectEthereal   

constants:  |   SPELL_* Constants
