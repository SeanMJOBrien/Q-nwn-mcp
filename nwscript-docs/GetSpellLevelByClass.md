<!-- Source: https://nwnlexicon.com/index.php?title=GetSpellLevelByClass&amp;action=history -->

# GetSpellLevelByClass(int, int)

Gets the spell level at which a class gets a spell. 
int GetSpellLevelByClass( int nClassType, int nSpellId);
#### Parameters 

nClassType
    A CLASS_TYPE_* constant. 

nSpellId
    a SPELL_* constant.
#### Description
Gets the spell level at which a class gets a spell. 
Returns: the spell level or -1 if the class does not get the spell. 
#### Remarks
This saves a few 2da lookups to quickly get when a given class can get a given spell. Doesn't check for domain spells but does check the master spell if a subspell is given as nSpellId. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetLastSpellLevel()   

constants:  |  CLASS_TYPE_* SPELL_*
