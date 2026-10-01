<!-- Source: https://nwnlexicon.com/index.php/EffectSkillDecrease -->

# EffectSkillDecrease(int, int)
Returns an effect to decrease a skill. 
effect EffectSkillDecrease( int nSkill, int nValue);
#### Parameters 

nSkill
    All skills (SKILL_ALL_SKILLS) or a specific skill ( SKILL_* ) to decrease 

nValue
    The number of points to decrease nSkill by. Must be 1 or higher.
#### Description
Returns an affect to decrease nSkill nValue points. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid. 
The limit for nValue is unknown. Bioware uses up and over 20, however. It is unknown if these stack or counter Increases in skills. 
To have an effect affect all skills, use the value SKILL_ALL_SKILLS for nSkill, instead of a specific one. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Once applied, the skill will change in the characters sheet, and all things to do with that skill will be affected. 
nSkill is merely a number reference to a skills.2da entry, although using appropriate SKILL_* constants is a better idea. 
Skill decreases can be counted by direct immunity to changes in skills - Immunity: Skill decrease. 
It is unknown if skill decreases stack. They should, however, simply overlap with bonuses to skills where appropriate. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This is a reasonably simple and effective effect. When a skill is checked, all the effects are counted up (increases, decreases, situational bonuses) and the total is applied. 
On the character sheet the effect will not make a skill appear red, but will move the number down properly (if not versus a specific alignment or race). 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
This is used in the internal "On Hit: Doom" effect (a -2 to all skills) and the internal effects of EffectNegativeLevel. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nSkill | The skill to decrease; see function params.   
1 | nValue | The value to decrease the skill(s) by; see function params.   
2 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
3 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
5 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
#### Version
1.62 
#### Example
// Example - Apply an effect to oTarget which will reduce// the hiding skill level by 2 for 60 seconds.void main(){ // Get who to affect object oTarget = GetLastUsedBy(); // Declare skill decrease effect eSkillDec = EffectSkillDecrease(SKILL_HIDE, 2); // Apply it for 60 seconds. ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eSkillDec, oTarget, 60.0f);}
#### See Also
functions:  |  EffectSkillIncrease  

constants:  |   SKILL_* Constants
