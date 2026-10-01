<!-- Source: https://nwnlexicon.com/index.php/ActionEquipMostDamagingRanged -->

# ActionEquipMostDamagingRanged(object)
Causes the calling creature to equip the most damaging ranged weapon in its inventory. 
void ActionEquipMostDamagingRanged( object oVersus = OBJECT_INVALID);

### Parameters 

oVersus
    Target object to determine the most damaging type of weapon against. (Default: OBJECT_INVALID)
### Description
The creature will equip the ranged weapon in its possession that can do the most damage (specifically against oVersus, if that is not OBJECT_INVALID). If no valid ranged weapon can be found, it will equip the most damaging melee weapon. 
This only takes into account the enchantment bonuses of the weapon - anything such as improved damage or attack bonuses seem to be ignored. 
There needs to be ammo for the weapon to be equipped - thrown weapons, of course, have no ammo. 
### Remarks
This function should only ever be called in the EndOfCombatRound (the OnCombatRoundEnd script, or uncomment the line with NW_FLAG_END_COMBAT_ROUND_EVENT in the OnSpawn script and use the OnUserDefined script) scripts, because otherwise it would have to stop the combat round to run simulation. 
As with all ActionEquip* functions, it is not necessary to first unequip the current item in the same inventory slot before equipping the new item. 
Note that for equipping any valid weapon, this is the most useful function - it will equip a melee weapon if no ranged weapon (with ammo) is found. 
This doesn't take into account shields (or lack thereof) and will never equip one, only unequip one if they use a two handed weapon. 
### Version
1.61 
### Example
// Make the NPC in conversation equip the most damaging ranged weapon against the PC, readying for combat main(){ object oPC = GetPCSpeaker(); ActionEquipMostDamagingRanged(oPC);}
### See Also
functions:  | ActionEquipMostDamagingMelee, EquipAppropriateWeapons
