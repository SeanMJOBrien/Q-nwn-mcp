<!-- Source: https://nwnlexicon.com/index.php/CheckFriendlyFireOnTarget -->

# CheckFriendlyFireOnTarget(object, float)
Gets how many friendly creatures are within a spherical range of a target object. 
int CheckFriendlyFireOnTarget( object oTarget, float fDistance = 5.0);

### Parameters 

oTarget
    The object target at the center of sphere to check for friends. 

fDistance
    The radius of sphere to check for friends. (Default: 5.0)
### Description
Returns how many creatures in a sphere of radius fDistance, centered on oTarget, are friendly. 
### Remarks
Friendly creatures with less than half the hit dice of the caller are not counted. 
Used in the Core AI to determine whether or not to use protection talents, enhancement effects, and harmful AoE spells. Prevents henchmen from using indiscriminate harmful AoE spells at all while friends are in the target area. 
### Requirements
#include "x0_i0_enemy" 
### Version
1.26 
### Example
// Have an NPC look around for a concentration of more than one enemy, make sure// no friendly creatures are within range, then fire off a Fireball spell if// they have one.void main(){ // Look for the nearest enemy we can see... object oTarget = GetNearestCreature(CREATURE_TYPE_REPUTATION, REPUTATION_TYPE_ENEMY, OBJECT_SELF, 1, CREATURE_TYPE_PERCEPTION, PERCEPTION_SEEN); // If there is an enemy... if (GetIsObjectValid(oTarget)) { // Get the number of enemies and allies near the target int nEnemy = CheckEnemyGroupingOnTarget(oTarget); int nAllies = CheckFriendlyFireOnTarget (oTarget); // If there are no allies nearby and at least two enemies, cast a // fireball spell at the target if (!nAllies && nEnemy > 1) ActionCastSpellAtObject(SPELL_FIREBALL, oTarget); }}
### See Also
functions:  | CheckEnemyGroupingOnTarget
