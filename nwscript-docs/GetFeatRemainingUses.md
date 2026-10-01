<!-- Source: https://nwnlexicon.com/index.php/GetFeatRemainingUses -->

# GetFeatRemainingUses(int, object)

If oCreature has nFeat, and nFeat is useable, returns the number of remaining uses left. 
int GetFeatRemainingUses( int nFeat, object oCreature=OBJECT_SELF);
#### Parameters 

nFeat
    The FEAT_* constant number or reference from feat.2da to query for remaining uses. 

oCreature
    The creature to query for remaining feat uses.
#### Description
If oCreature has nFeat, and nFeat is useable, returns the number of remaining uses left. 
If the feat has unlimited uses (e.g. FEAT_KNOCKDOWN) or the feat isn't useable (e.g. FEAT_ARMOR_PROFICIENCY_HEAVY), returns the maximum int value. 
#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  FEAT_* Constants   

functions:  | GetHasFeat()
