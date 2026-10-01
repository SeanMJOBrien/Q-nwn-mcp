<!-- Source: https://nwnlexicon.com/index.php?title=ClearMemorizedSpell&amp;action=history -->

# ClearMemorizedSpell(object, int, int, int)

Clear a specific memorized spell slot. 
void ClearMemorizedSpell( object oCreature, int nClassType, int nSpellLevel, int nIndex);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a MemorizesSpells class. 

nSpellLevel
    The spell level, 0-9. 

nIndex
    The index of the spell slot. Bounds: 0 <= nIndex < GetMemorizedSpellCountByLevel()
#### Description
Clear a specific memorized spell slot. 
#### Remarks
MemorizesSpells classes are Clerics, Druids, Wizards, Paladins and Rangers by default. These have a set of slots they fill up with what they want to memorise, compared to Sorcerers and Bards who can cast any spell they know up to a limit per spell level. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  SetMemorizedSpellReady, GetMemorizedSpellCountByLevel  

constants:  |  CLASS_TYPE_*
