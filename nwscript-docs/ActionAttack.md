<!-- Source: https://nwnlexicon.com/index.php/ActionAttack -->

# ActionAttack(object, int)
Initiates an attack between two creatures or a creature and an object. 
void ActionAttack( object oAttackee, int bPassive = FALSE);
### Parameters 

oAttackee
    The creature or object to be attacked 

bPassive
    Determines if the attack is in passive mode. (Default: FALSE)
### Description
Causes the calling creature to start attacking oAttackee using whichever weapon is current equipped. The attack will trigger oAttackee's OnPhysicalAttacked event, so if there's a script attached to it that causes oAttackee's reputation to change toward the attacker, it will fight back; however, ActionAttack by itself does not alter reputation. 
If bPassive is set to TRUE, the attacker will not move to attack oAttackee. If the attacker only has a melee weapon and oAttackee is far away, he will just stand there. 
### Remarks
To trigger a simple multi-round combat use DetermineCombatRound(), note however that if the attacker and the attackee's faction is the same, they will not fight even if a DetermineCombatRound() command is issued. 
To avoid a full combat sequence and just make a single attack when faction is involved (like a barmaid slapping someone, or a bouncer pushing some rowdy patron) then right before the ActionAttack call use: 
DelayCommand(2.0, SurrenderToEnemies());
...OR simply issue a ClearAllActions(TRUE) to stop the attack. 
ActionAttack applies to weapons (melee, missile, and natural monster weapons) only. It does not apply to any feats (except for passive ones), spells, or any other active talent. 
### Version
1.29 
### Example
// Set in a chest's OnOpen script. A nearby guard tagged// "CHEST_GUARD" will attack the person who opened the chest.void main(){ // Initialize Objects. object oGuard = GetObjectByTag("CHEST_GUARD"); object oPlayer = GetLastOpenedBy(); // Guard attacks the player that opened the chest. AssignCommand(oGuard, ActionDoCommand(SpeakString("Taste my blade you bloody thief!"))); AssignCommand(oGuard, ActionAttack(oPlayer));}
### See Also
functions:  | TalentDragonCombat
