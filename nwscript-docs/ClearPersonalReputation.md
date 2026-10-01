<!-- Source: https://nwnlexicon.com/index.php/ClearPersonalReputation -->

# ClearPersonalReputation(object, object)
Changes the friendly or hostile feelings an NPC or creature may have towards a PC, NPC, or other creature. 
void ClearPersonalReputation( object oTarget, object oSource = OBJECT_SELF);
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### Parameters 

oTarget
    A PC, NPC, or creature that oSource will now view differently. 

oSource
    The NPC or creature having changing its view of oTarget. (Default: OBJECT_SELF)
### Description
Clears all personal feelings that oSource has about oTarget. This is not a global effect for all members of a faction; it just affect oSource. 
### Version
1.22 
### See Also
functions:  | SetStandardFactionReputation
