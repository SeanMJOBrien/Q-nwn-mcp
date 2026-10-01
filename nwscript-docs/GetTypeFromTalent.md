<!-- Source: https://nwnlexicon.com/index.php/GetTypeFromTalent -->

# GetTypeFromTalent

# GetTypeFromTalent(talent)
Determines the primary category of the talent requested. 
int GetTypeFromTalent( talent tTalent);
#### Parameters
_tTalent_
#### Description
Returns the type (TALENT_TYPE_*) of tTalent. This is the primary (i.e. spell, feat and skill) category of the talent. 
#### Remarks
Use GetIdFromTalent function to return specific spell, feat or skill of tTalent. 
#### Version
1.22 
#### See Also
functions:  |   TalentBuffSelf   

constants:  |   TALENT_TYPE_* Constants
