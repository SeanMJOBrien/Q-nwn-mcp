<!-- Source: https://nwnlexicon.com/index.php?title=GetSpellFeatId&amp;action=history -->

# GetSpellFeatId()

In the spell script returns the feat used, or -1 if no feat was used. 
int GetSpellFeatId();
#### Description
In the spell script returns the feat used, or -1 if no feat was used. 
#### Remarks
If it is not -1 you can safely determine the feat.2da line that was used to cast the spell. Feats with successors should return the parent feat ID (eg Bard Song). 
This can be useful for scripts used by both spells and feats which one was used to capture special behaviour. 
Note that Area of Effect objects currently do not store this value for further use, although it does store the spell Id (see GetSpellId). 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetSpellId  

events:  |  Spell Script
