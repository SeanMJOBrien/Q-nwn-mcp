<!-- Source: https://nwnlexicon.com/index.php/SetMemorizedSpell -->

# SetMemorizedSpell(object, int, int, int, int, int, int, int)

Set a memorized spell slot. 
void SetMemorizedSpell( object oCreature, int nClassType, int nSpellLevel, int nIndex, int nSpellId, int bReady = TRUE, int nMetaMagic = METAMAGIC_NONE, int bIsDomainSpell = FALSE);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a MemorizesSpells class. 

nSpellLevel
    The spell level, 0-9. 

nIndex
    The index of the spell slot. Bounds: 0 <= nIndex < GetMemorizedSpellCountByLevel() 

nSpellId
    A SPELL_* constant. 

bReady
    TRUE to mark the slot ready. (default: TRUE) 

nMetaMagic
    A METAMAGIC_* constant. (default: METAMAGIC_NONE) 

bIsDomainSpell
    TRUE for a domain spell. (default: FALSE)
#### Description
Set a memorized spell slot. 
#### Remarks
MemorizesSpells classes are Wizards, Clerics etc, compared to Bards and Sorcerers. 
Domain spells cannot be cantrips so cannot be used on nSpellLevel 0 regardless of 2da changes. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  SetMemorizedSpellReady()   

constants:  |  CLASS_TYPE_* METAMAGIC_* SPELL_*
