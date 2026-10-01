<!-- Source: https://nwnlexicon.com/index.php?title=EffectEnemyAttackBonus&amp;action=history -->

# EffectEnemyAttackBonus(int)
Create an Enemy Attack Bonus effect. 
void EffectEnemyAttackBonus( int nBonus);
#### Parameters 

nBonus
    The bonus to apply. Positive adds a bonus to hit, negative adds a penalty to hit.
#### Description
Create an Enemy Attack Bonus effect. Creatures attacking the given creature with melee/ranged attacks or touch attacks get a bonus to hit. 
#### Remarks
It stacks so if applied multiple times nBonus is added up to the final value. 
The bonus value can be positive or negative (meaning you can make it harder for someone to hit a given creature), and since the effect icon can be removed or overridden this can be used to mimic "base AC" changes that are not affected by the creatures state (eg Flat Footed) and stack differently to other AC effects (ie no items would use this effect), although in the combat debugging it will display as "Enemy Attack Bonus" with the given final value this usually isn't available to players. 
It will affect ranged and melee touch attacks, even those from placeable objects. 
Even though it is an EE added effect this effect was in the game since very early on given the constant was in the first released version of the game, it's unknown why it was never fully implemented. It already has an EFFECT_TYPE_ENEMY_ATTACK_BONUS, an effecticons.2da icon to use (which this does by default), and combat debug lines. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
#### See Also
constants:  |  EFFECT_TYPE
