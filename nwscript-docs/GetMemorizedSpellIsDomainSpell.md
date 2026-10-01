<!-- Source: https://nwnlexicon.com/index.php?title=GetMemorizedSpellIsDomainSpell&amp;action=history -->

# GetMemorizedSpellIsDomainSpell(object, int, int, int)

Gets if the memorized spell slot has a domain spell. 
int GetMemorizedSpellIsDomainSpell( object oCreature, int nClassType, int nSpellLevel, int nIndex);
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
Gets if the memorized spell slot has a domain spell. Returns: TRUE/FALSE or -1 if the slot is not set. 
#### Remarks
MemorizesSpells classes are Clerics, Wizards and the like, compared to Sorcerers and Bards. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  CLASS_TYPE_*
