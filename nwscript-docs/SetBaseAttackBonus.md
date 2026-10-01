<!-- Source: https://nwnlexicon.com/index.php?title=SetBaseAttackBonus&amp;action=history -->

# SetBaseAttackBonus(int, object)
Sets the number of base attacks for the specified creature 
void SetBaseAttackBonus( int nBaseAttackBonus, object oCreature = OBJECT_SELF);
### Parameters 

nBaseAttackBonus
    Number of base attacks per round, 1 to 6 

oCreature
    Creature to set the bonus on (Default: OBJECT_SELF)
### Description
Sets the number of base attacks each round for the specified creature (PC or NPC). 
If set on a PC it will not be shown on their character sheet, but will save to BIC/savegame. 
### Remarks
This function does not actually set the base attack bonus for the creature. Rather, it sets the number of attacks he can make in a round. As is standard in NWN, each successive attack per round suffers a -5 penalty. If the character has levels in Monk and fights with Unarmed Strike, each successive attack per round suffers a -3 penalty. These values might be altered with ruleset.2da edits. 
You can retrieve this value using GetAttacksPerRound. 
Bioware use this to _limit_ the amount of attacks high end golems can make. It is probably the best use case for it, since increasing the attack amounts can easily put the to-hit modifiers into high negatives. 
Since this can be used on PCs, with ruleset.2da alterations it can provide some potentially interesting progressions for custom modules. However do note the character sheet will not show any changes (since presumably Bioware never really intended it to be used on PCs). 
If you want to temporarily add some attacks EffectModifyAttacks may be a good option, although make sure to read the remarks on how it operates. 
### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetBaseAttackBonus() description in nwscript.nss to properly describe how it works on PCs. 
### See Also
functions:  | RestoreBaseAttackBonus EffectModifyAttacks
