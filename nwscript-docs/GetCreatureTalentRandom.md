<!-- Source: https://nwnlexicon.com/index.php/GetCreatureTalentRandom -->

# GetCreatureTalentRandom(int, object)
Retrieves a random talent from a group of talents that a creature possesses. 
talent GetCreatureTalentRandom( int nCategory, object oCreature = OBJECT_SELF);
#### Parameters 

nCategory
    TALENT_CATEGORY_* 

oCreature
    The creature who potentially possesses a talent within the specified talent category. (Default: OBJECT_SELF)
#### Description
Returns a random talent of oCreature, within nCategory. 
#### Remarks
It is possible for nCreature not to have any talent within the specified nCategory. In this case this function will return an invalid talent, akin to OBJECT_INVALID, but you must use the GetIsTalentValid() to test this. 
If nCategory = 0, returns anything without category, known feats (but not with 0 uses) and skills. 
The talent engine checks most talent prerequisities: class level and base ability score for spells, use limitation itemproperty for items, and will not return talents that creature is not able to use. This validity control doesn't work well with polymorphed creatures though. Only item (excluding potion) talents are disallowed to use in polymorph, everything else is allowed. 
This function is not entirely random. Item talents are returned only if creature has no other talents in the same category. 
Note this function is the same as calling GetCreatureTalentBest with -1 as the CR parameter: 
GetCreatureTalentBest(nCategory, -1, oCreature);
#### Known bugs
Returns an invalid talent if the creature is immobilized (toolset speed setting, entangle effect or cutscene immobility). 
Specifying nCategory 1 actually returns talents of category 11 and vice versa. _Confirmation needed._
#### Version
1.22 
#### See Also
functions:  | GetCreatureTalentBest, GetIsTalentValid  

constants:  | TALENT_CATEGORY_* Constants
