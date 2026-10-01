<!-- Source: https://nwnlexicon.com/index.php/TouchAttackMelee -->

# TouchAttackMelee(object, int)
Performs a touch melee attack out of turn. 
int TouchAttackMelee( object oTarget, int bDisplayFeedback = TRUE, object oAttacker = OBJECT_SELF);
#### Parameters 

oTarget
    The target of the touch melee attack. 

bDisplayFeedback
    Display graphical feedback on the attack. (Default: TRUE) 

oAttacker
    The attacker making the touch attack. (Default: OBJECT_SELF)
#### Description
The caller will perform a melee touch attack on oTarget. This is not an action, and it assumes oAttacker is already within range of oTarget. 
Returns 0 on a miss, 1 on a hit, and 2 on a critical hit. 
#### Remarks
No combat animations are performed, and no damage is dealt. It simply does a roll to see if the target is hit, and if bDisplayFeedback is TRUE, displays feedback in the combat feedback window. 
The attackers melee touch attacks are based on: 
  * BAB + strength modifier (only if positive) + nature sense + epic prowess (unless a ranged weapon is equipped) + unarmed weapon focus feats (if unarmed or using a creature weapon) + effects

A touch attack denies the defender their armor and shield AC (base and bonus), as well as their natural armor bonus to AC. All other armor class modifiers, such as the size modifier, dexterity modifier, and deflection/dodge bonus apply (or don't apply, e.g. if flat-footed) normally. Consequentially, touch attacks sometimes have a significantly better chance of hitting than regular attacks. 
Touch attacks are affected by concealment and miss chance effects when a creature is making the attack. 
#### Known Bugs
Critical hits are automatic on a roll of 20 but do not check oTarget for critical hit immunity. 
#### Version
This function was updated in 1.83.8193.21 of NWN:EE. It made it so weapon attack bonuses are not added to touch attacks, for instance arming yourself with a +5 Longsword will not add 5 to the attack rolls of this function anymore. 
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added oAttacker parameter to TouchAttackMelee(). 
#### See Also
functions:  |  TouchAttackRanged
