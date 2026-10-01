<!-- Source: https://nwnlexicon.com/index.php/CheckEnemyGroupingOnTarget -->

# CheckEnemyGroupingOnTarget(object, float)
Gets the number of enemies in a sphere shape around a target. 
int CheckEnemyGroupingOnTarget( object oTarget, float fDistance = 5.0);

### Parameters 

oTarget
    An object target, the center of sphere to check for enemies. 

fDistance
    The radius of sphere to check for enemies. (Default: 5.0)
### Description
Returns how many targets of the enemy faction are in a sphere centered on oTarget and within fDistance of them. This is the converse of CheckFriendlyFireOnTarget(). 
### Remarks
Function found in x0_i0_enemy.nss on line 594. 
A very useful function for NPC AI. This one loops through all targets around 1 creature and determines how many of them are considered an Enemy by the calling object. 
### Requirements
#include "x0_i0_enemy" 
### Version
1.22 
### Example
// Have an NPC look around for a concentration of more than one enemy, make sure// no friendly creatures are within range, then fire off a Fireball spell if// they have one.void main(){ // Look for the nearest enemy we can see... object oTarget = GetNearestCreature(CREATURE_TYPE_REPUTATION, REPUTATION_TYPE_ENEMY, OBJECT_SELF, 1, CREATURE_TYPE_PERCEPTION, PERCEPTION_SEEN); // If there is an enemy... if (GetIsObjectValid(oTarget)) { // Get the number of enemies and allies near the target int nEnemy = CheckEnemyGroupingOnTarget(oTarget); int nAllies = CheckFriendlyFireOnTarget (oTarget); // If there are no allies nearby and at least two enemies, cast a // fireball spell at the target if (!nAllies && nEnemy > 1) ActionCastSpellAtObject(SPELL_FIREBALL, oTarget); }}
### See Also
functions:  | CheckFriendlyFireOnTarget
