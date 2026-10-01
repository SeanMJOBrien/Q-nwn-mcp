<!-- Source: https://nwnlexicon.com/index.php/GetMemorizedSpellCountByLevel -->

# GetMemorizedSpellCountByLevel(object, int, int)

Gets the number of memorized spell slots for a given spell level. 
int GetMemorizedSpellCountByLevel( object oCreature, int nClassType, int nSpellLevel);
#### Parameters 

oCreature
    The creature. 

nClassType
    a CLASS_TYPE_* constant. Must be a MemorizesSpells class. 

nSpellLevel
    The spell level, 0-9.
#### Description
Gets the number of memorized spell slots for a given spell level. 
Returns: the number of spell slots. 
#### Remarks
MemorizesSpells classes are Clerics, Wizards etc. compared to Bards or Sorcerers. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  CLASS_TYPE_*
