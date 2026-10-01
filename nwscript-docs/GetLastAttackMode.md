<!-- Source: https://nwnlexicon.com/index.php/GetLastAttackMode -->

# GetLastAttackMode(object)
Determine a creature's combat mode. 
int GetLastAttackMode( object oCreature = OBJECT_SELF);
#### Parameters 

oCreature
    Creature which is attacking. (Default: OBJECT_SELF)
#### Description
Returns the attack mode (COMBAT_MODE_*) of oCreature's last attack. Returns COMBAT_MODE_INVALID if the creature is not in combat, or if no special combat mode was used in the last attack. 
This should be used in a creature/objects OnPhysicalAttacked event, and using the last attacker as oCreature, although it can be used elsewhere. 
The COMBAT_MODE_* constants are "always on" attack things, and can be used with special attacks (SPECIAL_ATTACK_*) such as knockdown, but not more then one at once. 
#### Remarks
This usually only works when oCreature is in combat. NWN:EE added "sticky combat modes" which may mean it now functionally works out of combat too (if they happen to leave a mode enabled). 
Most modes can also be checked with GetActionMode, which may be more reliable outside of OnPhysicalAttacked. 
Most useful way of using this is within creature and henchmen AI scripts. Parry is the most obvious - if we know the last attack was from a person using parry, they must have got a passed skill check and we didn't get a hit in - perhaps it is time to change targets? 
There is no way to check if the combat mode used was successful or not, or even if it hit the object (so, just because someone is using power attack, doesn't mean they are doing a monkeys uncles worth of damage with it). The On Physical Attacked event runs whenever a targeted attack is performed - not when it hits. 
See the code example of a more possibly regular use for this function. 
#### Version
1.62 
#### Example
// In this placeables On Physical Attacked event, a combat dummy,// it checks for COMBAT_MODE_RAPID_SHOT. This is perhaps// some kind of archery test. The player doesn't have to hit the target// for this to fire, but the PC will only miss on a 1 anyway (5% chance)void main(){ // Only do this event once (uses "return;" to stop the script) // * Only stop this from running again if they are successful if(GetLocalInt(OBJECT_SELF, "DO_ONCE") == TRUE) return; // Get attacker, and mode attacked in. object oAttacker = GetLastAttacker(); int nMode = GetLastAttackMode(oAttacker); // Check nMode if(nMode == COMBAT_MODE_RAPID_SHOT) { // Do not do this event again SetLocalInt(OBJECT_SELF, "DO_ONCE", TRUE); // Send the PC a message, reward them some XP, once SendMessageToPC(oAttacker, "You successfully attacked this with rapid shot"); GiveXPToCreature(oAttacker, 50); }}
#### See Also
functions:  |  GetActionMode  

constants:  |   COMBAT_MODE_* Constants   
events:  |  OnPhysicalAttacked
