<!-- Source: https://nwnlexicon.com/index.php/EffectSpellLevelAbsorption -->

# EffectSpellLevelAbsorption(int, int, int)
Returns a Spell Level Absorption effect. 
effect EffectSpellLevelAbsorption( int nMaxSpellLevelAbsorbed, int nTotalSpellLevelsAbsorbed=0, int nSpellSchool=SPELL_SCHOOL_GENERAL);
#### Parameters 

nMaxSpellLevelAbsorbed
    Maximum spell level that will be absorbed by the effect. Valid values -1 through 9 (although spells are only level 0 through 9). 

nTotalSpellLevelsAbsorbed
    Maximum number of spell levels that will be absorbed by the effect, or unlimited if 0. 

nSpellSchool
    Spell school to absorb specifically, or SPELL_SCHOOL_GENERAL for any spell school. SPELL_SCHOOL_* constants.
#### Description
Returns a Spell Level Absorption effect. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if: nMaxSpellLevelAbsorbed is not between -1 and 9 inclusive, or nSpellSchool is invalid. 
The limit of nTotalSpellLevelsAbsorbed is unknown. It is known that if it is 0, there is no limit. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
The "Stoneskin" of Spell Immunities. This is used in several ways: 
  * Provide immunity to an entire spell school (IE: Shadow Shield)
  * Provide immunity to a certain amount of spells (IE: Spell Mantle)
  * Provide immunity to all spells of a certain level and below (IE: Globe of Invulnerability).

It is thus very useful, and dynamic for the most part. 
The highest level spell is 9, so putting 9 as the level absorbed will absorb anything (that uses spell resistance). 
Anything without a ResistSpell check in the spell script will ignore this, as it won't even check if it exists. The hardcoded aspect of this effect is that only ResistSpell will alter any remaining levels, or check immunity to a certain spell school or spell level. 
Also a note on how nTotalSpellLevelsAbsorbed is used. Firstly, it is hidden from the user, and never displayed. Secondly, it works as so: 
  1. If we start with 10 levels of spells to ignore, and ignore any of level 9 or lower (any spell) then the user doesn't know we have 10.
  2. If we cast Fireball (a level 4 spell) on the person, then the number, internally, will decrease to 6 (10 - 4 = 6) and the spell will be resisted.
  3. If we cast Ray of Frost at the target (a Cantrip, level 0 spell) then it will be resisted, and no actual decrease to the amount of spells we can resist - it will decrease by 0 (6 - 0 = 6)
  4. If we then cast Wail of the Banshee (a level 9 spell!) then it will *still* resist the spell, but use up all of the remaining levels, making the effect go away.
  5. Any more hostile spells will now affect the person as normal.

Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
See ResistSpell for more detailed information on how the effect is checked for and used (beyond the examples above) and how it interacts with immunity to specific spells, spell resistance and similar properties granted by items. 
If the levels of absorption are not unlimited, and the effect is linked to others with EffectLinkEffects, then the entire link of effects are removed once this effect is used up. This can be useful (boss monsters being immune to damage until enough spells are cast) or not useful (if you want a spell effect which has limited absorption but also some additional bonuses). 
Note that you can put -1 into nMaxSpellLevelAbsorbed. Why? No idea. All spells are level 0 or higher, therefore would "bypass" this in a SR check. Possibly at one point in the games development this would have made sense. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nMaxSpellLevelAbsorbed | This is static, set when the effect is created.   
1 | nTotalSpellLevelsAbsorbed | This is either 0 (unlimited) or a dynamically decreasing number.   
2 | nSpellSchool | Since SPELL_SCHOOL_GENERAL is 0, any other value means a specific spell school.   
3 | Unlimited spells to absorb? TRUE or FALSE | This is simply set to TRUE if nTotalSpellLevelsAbsorbed is 0, or FALSE if not. It's likely a safer way of checking, but since scripts can't change the amount of nTotalSpellLevelsAbsorbed either can be tested.   
#### Version
1.62 
#### Example
// Sample code for applying immunity to level 6 or lower// necromancy spell, and can absorb up to 20 levels of them,// to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eAbsorb = EffectSpellLevelAbsorption(6, 20, SPELL_SCHOOL_NECROMANCY); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SPELL_MANTLE_USE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eAbsorb, oTarget);}
#### See Also
functions:  |  EffectSpellImmunity EffectSpellResistanceIncrease EffectSpellResistanceDecrease  

constants:  |  SPELL_SCHOOL_*
