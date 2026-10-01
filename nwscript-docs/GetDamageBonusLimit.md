<!-- Source: https://nwnlexicon.com/index.php?title=GetDamageBonusLimit&amp;action=history -->

# GetDamageBonusLimit()

Gets the damage bonus limit. 
int GetDamageBonusLimit();
### Description
Gets the damage bonus limit. The default is 100. 
### Remarks
This is buggy; see Known Bugs. 
### Known Bugs
This doesn't actually work as intended - the value is tested after all melee/ranged damage is already applied so doesn't cap anything. It however will affect ActionEquipMostDamagingMelee/ActionEquipMostDamagingRanged and the combat debugging feedback so safest to leave it at 100 or 255. 
### Version
This function was added in 1.74.8158 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetDamageBonusLimit()
