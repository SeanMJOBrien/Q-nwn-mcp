<!-- Source: https://nwnlexicon.com/index.php/GetLastSpellLevel -->

# GetLastSpellLevel()

Returns the level of the last spell cast. 
int GetLastSpellLevel();
#### Description
Returns the level of the last spell cast. This value is only valid in a Spell script. 
#### Remarks
This will be what ResistSpell will use in regards to EffectSpellLevelAbsorption and similar effects. Due to domain spells, it is not always accurate just checking the casters spell level in spells.2da since domain spells can be of any level. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also  
---
