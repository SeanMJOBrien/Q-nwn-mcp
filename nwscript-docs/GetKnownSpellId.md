<!-- Source: https://nwnlexicon.com/index.php?title=GetKnownSpellId&amp;action=history -->

# GetKnownSpellId(object, int, int, int)

Gets the spell id of a known spell. 
int GetKnownSpellId( object oCreature, int nClassType, int nSpellLevel, int nIndex);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a SpellBookRestricted class. 

nSpellLevel
    The spell level, 0-9. 

nIndex
    The index of the spell slot. Bounds: 0 <= nIndex < GetKnownSpellCount()
#### Description
Gets the spell id of a known spell. 
Returns: a SPELL_* constant or -1 on error. 
#### Remarks
Clerics, Wizards etc. are restricted classes, compared to Bards and Sorcerers who can cast any known spell. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetKnownSpellCount()   

constants:  |  CLASS_TYPE_*
