<!-- Source: https://nwnlexicon.com/index.php/GetCreatureTalentBest -->

# GetCreatureTalentBest(int, int, object)
Determines the best talent of a creature from a group of talents. 
talent GetCreatureTalentBest( int nCategory, int nCRMax, object oCreature = OBJECT_SELF);
#### Parameters 

nCategory
    TALENT_CATEGORY_* 

nCRMax
    The maximum Challenge Rating of the talent. Note this can be actually -1 in which case the function acts like GetCreatureTalentRandom see remarks below. 

oCreature
    The creature that has the talent. (Default: OBJECT_SELF)
#### Description
Returns the best talent (i.e. closest to nCRMax without going over) of oCreature, within nCategory. 
#### Remarks
The talents are selected in the spells.2da file by using the CATEGORY column to check for spells that equal the number of nCategory. The feat.2da file is also checked using the CATEGORY column within it. For example if TALENT_CATEGORY_HARMFUL_RANGED (2) is used then it will look for a spell/feat with a 2 in the CATEGORY column that oCreature can use and then return a valid one. 
It is possible for nCreature not to have any talent within the specified nCategory. In this case this function will return an invalid talent, akin to OBJECT_INVALID, but you must use the GetIsTalentValid() to test this. 
If CR = -1 function works like GetCreatureTalentRandom, CR = 0 returns potions, scrolls and other unequippable items, spell has CR equal to (InnateLevel*2)-1, feats probably 0 as well. 
If nCategory = 0, returns anything without category, known feats (but not with 0 uses) and skills. 
The talent engine checks most talent prerequisities: class level and base ability score for spells, use limitation itemproperty for items, and will not return talents that creature is not able to use. This validity control doesn't work well with polymorphed creatures though. Only item (excluding potion) talents are disallowed to use in polymorph, everything else is allowed. 
#### Known bugs
Returns invalid talent if the creature is immobilized (toolset speed setting, entangle effect or cutscene immobility). 
There is an issue when using the constants of TALENT_CATEGORY_HARMFUL_AREAEFFECT_DISCRIMINANT (1) and TALENT_CATEGORY_HARMFUL_AREAEFFECT_INDISCRIMINANT (11) in nCategory. They will get a talent from the other ones category. 
This happens when the server and/or area are set to anything other than full pvp for the server and area. If server/game's PVP setting is set to FULL and the area is set to either Full PVP or Default then they will work as expected. 
#### Version
1.22 
#### See Also
functions:  | GetCreatureTalentRandom, GetIsTalentValid  

constants:  | TALENT_CATEGORY_* Constants
