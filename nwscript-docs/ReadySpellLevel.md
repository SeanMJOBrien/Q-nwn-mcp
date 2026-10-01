<!-- Source: https://nwnlexicon.com/index.php/ReadySpellLevel -->

# ReadySpellLevel(object, int, int)

Ready a spell level for oCreature. 
void ReadySpellLevel( object oCreature, int nSpellLevel, int nClassType = CLASS_TYPE_INVALID, int nSlotstoRead = 255);
#### Parameters 

oCreature
    The creature. 

nSpellLevel
    An integer from 0-9. 

nClassType
    a CLASS_TYPE_* constant or CLASS_TYPE_INVALID to ready the spell level for all classes. (Default: CLASS_TYPE_INVALID) 

nSlotsToReady
    The amount of spells to set to ready at the given spell level. 0 will clear all uses, negative numbers will reduce the amount, positive increase the amount. (Default: 255)
#### Description
Ready a spell level for oCreature. 
For instance a Sorcerer with 2 of 4 castings of level 1 spells left, will get all 4 castings available after using ReadySpellLevel(oCreature, 1, CLASS_TYPE_SORCERER, 255) 
#### Remarks
Acts like resting essentially, except just for spells of a particular spell level. 
Individual slots on a Wizard/Cleric style class can be done with SetMemorizedSpellReady. 
Now Sorcerers, Bards etc. can have spell levels increased or decreased. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added nSlotsToReady to ReadySpellLevel(). 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  CLASS_TYPE_*
