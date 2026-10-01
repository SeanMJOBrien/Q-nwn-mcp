<!-- Source: https://nwnlexicon.com/index.php?title=GetKnownSpellCount&amp;action=history -->

# GetKnownSpellCount(object, int, int)

Gets the number of known spells for a given spell level. 
int GetKnownSpellCount( object oCreature, int nClassType, int nSpellLevel);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a SpellBookRestricted class. 

nSpellLevel
    The spell level, 0-9.
#### Description
Gets the number of known spells for a given spell level. 
Returns: the number of known spells. 
#### Remarks
Wizards, Sorcerers and Bards who can choose from a limited selection of spells to cast are SpellBookRestricted. Clerics, Druids, Paladins and Rangers are not restricted and know all their spells at all times. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetKnownSpellId()   

constants:  |  CLASS_TYPE_*
