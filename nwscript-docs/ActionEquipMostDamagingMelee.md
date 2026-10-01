<!-- Source: https://nwnlexicon.com/index.php/ActionEquipMostDamagingMelee -->

# ActionEquipMostDamagingMelee(object, int)
Causes the calling creature to equip its most damaging weapon. 
void ActionEquipMostDamagingMelee( object oVersus = OBJECT_INVALID, int bOffHand = FALSE);

### Parameters 

oVersus
    Object used to determine the most damaging weapon against. (Default: OBJECT_INVALID) 

bOffHand
    Determines if an off-hand weapon is equipped. (Default: FALSE)
### Description
The creature will equip the melee weapon in its possession that can do the most damage (specifically against oVersus, if it is not OBJECT_INVALID). If no valid melee weapon is found, it will equip the most damaging ranged weapon. 
This only takes into account the enchantment bonuses of the weapon - anything such as improved damage or attack bonuses seem to be ignored. 
### Remarks
While the original comments suggest this can only be used in the OnCombatRoundEnd script, this is false and it can be called at anytime. 
It is a relatively expensive function when there is a lot of equipment (a potential case on henchmen). 
As with all ActionEquip* functions, it is not necessary to first unequip the current item in the same inventory slot before equipping the new item. 
This doesn't take into account shields (or lack thereof): it will never equip one, and will only unequip one if they use a two handed weapon. 
### Version
1.61 
### Example
// When we see a PC, we equip our best melee weapon and go "grrr" -// 'cause we're an orc, or something, of course.// * Use the OnUserDefined Event for perceptionvoid main(){ // User event 1002 is the Perception event. if(GetUserDefinedEvent() == 1002) { // Make sure we are not in combat and we only do it once if(GetLocalInt(OBJECT_SELF, "EQUIPPED") == FALSE && (OBJECT_SELF)) { // We equip the weapon if the perceieved object is a PC if(GetIsPC(GetLastPercieved()) { // Speak the string, equip, set to not do it again ClearAllActions(); SpeakString("Grrrrr"); ActionEquipMostDamagingMelee(); SetLocalInt(OBJECT_SELF, "EQUIPPED", TRUE); return; } } }}
### See Also
functions:  | ActionEquipMostDamagingRanged, EquipAppropriateWeapons
