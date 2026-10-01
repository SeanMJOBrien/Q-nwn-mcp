<!-- Source: https://nwnlexicon.com/index.php?title=GetMemorizedSpellId&amp;action=history -->

# GetMemorizedSpellId(object, int, int, int)

Gets the spell id of a memorized spell slot. 
int GetMemorizedSpellId( object oCreature, int nClassType, int nSpellLevel, int nIndex);
#### Parameters 

oCreature
    The creature. 

nClassType
    a CLASS_TYPE_* constant. Must be a MemorizesSpells class. 

nSpellLevel
    An integer from 0-9. 

nIndex
    The index of the spell slot. Bounds: 0 <= nIndex < GetMemorizedSpellCountByLevel()
#### Description
Gets the spell id of a memorized spell slot. Returns: a SPELL_* constant or -1 if the slot is not set. 
#### Remarks
MemorizedSpells classes are Clerics, Wizards etc. compared to Sorcerers and Bards. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  CLASS_TYPE_*
