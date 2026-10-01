<!-- Source: https://nwnlexicon.com/index.php/CompareLastSpellCast -->

# CompareLastSpellCast(int)
Determines if a spell is the same as the one previously cast by the creature. 
int CompareLastSpellCast( int nSpell);

### Parameters 

nSpell
    A SPELL_* constant representing the spell to compare.
### Description
Returns TRUE if nSpell is the last spell used, otherwise FALSE. 
Used in conjuction with SetLastGenericSpellCast(). 
### Remarks
Compares a spell with the last spell cast. Used internally by the AI so it doesn't keep casting the same spell. 
### Requirements
#include "x0_inc_generic" 
### Version
1.28 
### See Also
functions:  | SetLastGenericSpellCast  

constants:  | SPELL_* Constants
