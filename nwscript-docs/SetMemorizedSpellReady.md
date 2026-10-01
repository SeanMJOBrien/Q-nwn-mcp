<!-- Source: https://nwnlexicon.com/index.php?title=SetMemorizedSpellReady&amp;action=history -->

# SetMemorizedSpellReady(object, int, int, int, int)

Set the ready state of a memorized spell slot. 
void SetMemorizedSpellReady( object oCreature, int nClassType, int nSpellLevel, int nIndex, int bReady);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a MemorizesSpells class. 

nSpellLevel
    The spell level, 0-9. 

nIndex
    The index of the spell slot. Bounds: 0 <= nIndex < GetMemorizedSpellCountByLevel() 

bReady
    TRUE to mark the slot ready.
#### Description
Set the ready state of a memorized spell slot. 
#### Remarks
Can return spells into use for Wizard/Cleric style casters. For Sorcerers and Bards see ReadySpellLevel with caveats if you want to ready just one more. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  SetMemorizedSpell()   

constants:  |  CLASS_TYPE_*
