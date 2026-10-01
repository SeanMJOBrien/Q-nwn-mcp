<!-- Source: https://nwnlexicon.com/index.php/TalentFeat -->

# TalentFeat

# TalentFeat(int)
Creates a talent that corresponds to an associated D&D feat. 
talent TalentFeat( int nFeat);
#### Parameters
_nFeat_
 FEAT_* 
#### Description
Creates a talent out of a feat constant. This is used in conjunction with various talent abilities to determine the best action the AI should attempt. This should not be used - it doesn't currently work. 
#### Remarks
It should do the same as ActionUseFeat(), but currently is broken and using it doesn't work in anyway whatsoever. Definitely use ActionUseFeat() until it is fixed or removed. 
#### Known Bugs
Currently, anytime this is used, it is invalid and if passed into ActionUseTalent, it will result in the NPC not doing anything and standing there. 
#### Version
1.22 
#### See Also
functions:  |   TalentSpell   

constants:  |   FEAT_* Constants
