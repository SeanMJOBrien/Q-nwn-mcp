<!-- Source: https://nwnlexicon.com/index.php?title=ClearMemorizedSpellBySpellId&amp;action=history -->

# ClearMemorizedSpellBySpellId(object, int, int)

Clear all memorized spell slots of a specific spell id, including metamagic'd ones. 
void ClearMemorizedSpellBySpellId( object oCreature, int nClassType, int nSpellId);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. Must be a MemorizesSpells class. 

nSpellId
    a SPELL_* constant.
#### Description
Clear all memorized spell slots of a specific spell id, including metamagic'd ones. 
#### Remarks
MemorizesSpells classes are Clerics, Druids, Wizards, Paladins and Rangers by default. These have a set of slots they fill up with what they want to memorise, compared to Sorcerers and Bards who can cast any spell they know up to a limit per spell level. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  ClearMemorizedSpell()   

constants:  |  CLASS_TYPE_* SPELL_*
