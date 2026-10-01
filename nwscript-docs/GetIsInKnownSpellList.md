<!-- Source: https://nwnlexicon.com/index.php/GetIsInKnownSpellList -->

# GetIsInKnownSpellList(object, int, int)

Gets if a spell is in the known spell list. 
int GetIsInKnownSpellList( object oCreature, int nClassType, int nSpellId);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a SpellBookRestricted class. 

nSpellId
    A SPELL_* constant.
#### Description
Gets if a spell is in the known spell list. 
Returns: TRUE if the spell is in the known spell list. 
#### Remarks
Wizards, Sorcerers and Bards who can choose from a limited selection of spells to cast are SpellBookRestricted. Clerics, Druids, Paladins and Rangers are not restricted and know all their spells at all times. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetKnownSpellCount() GetKnownSpellId()   

constants:  |  CLASS_TYPE_* SPELL_*
