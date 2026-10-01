<!-- Source: https://nwnlexicon.com/index.php/SetDamageBonusLimit -->

# SetDamageBonusLimit(int)

Sets the damage bonus limit. 
void SetDamageBonusLimit( int nNewLimit);
### Parameters 

nNewLimit
    The value to set the bonus to.
### Description
Sets the damage bonus limit. The default value is 100. The minimum value is 0. The maximum value is 255. 
### Remarks
This is buggy; see Known Bugs. 
### Known Bugs
This doesn't actually work as intended - the value is tested after all melee/ranged damage is already applied so doesn't cap anything. It however will affect ActionEquipMostDamagingMelee/ActionEquipMostDamagingRanged and the combat debugging feedback so safest to leave it at 100 or 255. 
### Version
This function was added in 1.74.8158 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetDamageBonusLimit()
