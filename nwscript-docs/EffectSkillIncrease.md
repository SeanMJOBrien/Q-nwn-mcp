<!-- Source: https://nwnlexicon.com/index.php/EffectSkillIncrease -->

# EffectSkillIncrease(int, int)
Returns an effect which will cause a skill increase. 
effect EffectSkillIncrease( int nSkill, int nValue);
#### Parameters 

nSkill
    All skills (SKILL_ALL_SKILLS) or a specific skill ( SKILL_* ) to increase 

nValue
    The number of points to increase nSkill by. Must be 1 or higher.
#### Description
Returns an effect which will cause a skill increase of nValue levels if nSkill is valid. 
The limit for nValue is usually 50. SetSkillBonusLimit can be used to alter this limit. 
To have an effect affect all skills, use the value SKILL_ALL_SKILLS for nSkill, instead of a specific one. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Once applied, the skill will change in the characters sheet, and all things to do with that skill will be affected. 
nSkill is merely a number reference to a skills.2da entry, although using appropriate SKILL_* constants is a better idea. 
It is unknown if skill increases stack. They should, however, simply overlap with penalties to skills where appropriate. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This is a reasonably simple and effective effect. When a skill is checked, all the effects are counted up (increases, decreases, situational bonuses) and the total is applied. 
On the character sheet the effect will not make a skill appear green, but will move the number down properly (if not versus a specific alignment or race). 
One special note: increases do not grant base skill ranks. You need at least 1 rank (the skill added points during level up) in some skills to make use of them. This will not bypass that requirement. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
This is used in the internal "On Hit: Doom" effect (a -2 to all skills) and the internal effects of EffectNegativeLevel. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nValue | The amount to decrease the save by, thus 2 here means -2 on saving throws.   
1 | nSkill | The base (SKILL_* ) type (ie. SKILL_ANIMAL_EMPATHY, SKILL_APPRAISE, etc), or SKILL_ALL_SKILLS for all skills.   
2 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
3 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
5 | NA | Not used for Skills. Presumably always returns 0.   
#### Version
1.62 
#### Example
// Example - Apply an effect to oTarget which will increase// the search skill level by 2 for 60 seconds.void main(){ // Get who to affect object oTarget = GetLastUsedBy(); // Declare skill decrease effect eSkillInc = EffectSkillIncrease(SKILL_SEARCH, 2); // Apply it for 60 seconds. ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eSkillInc, oTarget, 60.0f);}
#### See Also
functions:  |   EffectSkillDecrease   

constants:  |   SKILL_* Constants
