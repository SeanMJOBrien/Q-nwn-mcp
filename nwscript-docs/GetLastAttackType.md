<!-- Source: https://nwnlexicon.com/index.php/GetLastAttackType -->

# GetLastAttackType(object)
Determine the attack type of the last physical attack against a creature. 
int GetLastAttackType( object oCreature = OBJECT_SELF);
#### Parameters 

oCreature
    Creature which is being attacked (Default: OBJECT_SELF)
#### Description
Returns the attack type (SPECIAL_ATTACK_*) of the attack last used on oCreature. Use this with OBJECT_SELF in the OnPhysicalAttacked event. 
#### Remarks
This seems to retain the last special attack used against oCreature regardless of combat or not. The attacker can be found with GetLastAttacker. 
It is only really set properly when used in the OnPhysicalAttacked event, using it elsewhere can be problematic since the old value persists. 
#### Known Bugs
Taunt and Animal Empathy events will run the OnPhysicalAttacked script but causes the SPECIAL_ATTACK_* to be never reset/be set (ie: there is no SPECIAL_ATTACK_TAUNT) causing logic bugs since Knockdown and an immediate Taunt causes it to incorrect detect a Knockdown being used in the second call of OnPhysicalAttacked. 
The function only works as intended as long as long as OBJECT_SELF is passed in as the parameter for OnPhysicalAttacked - the toolset description is just wrong and needs updating. 
#### Version
#### Example
string GetAttackTypeString(int nAttackType){ switch(nAttackType) { case SPECIAL_ATTACK_CALLED_SHOT_ARM: return "SPECIAL_ATTACK_CALLED_SHOT_ARM"; break; case SPECIAL_ATTACK_CALLED_SHOT_LEG: return "SPECIAL_ATTACK_CALLED_SHOT_LEG"; break; case SPECIAL_ATTACK_DISARM: return "SPECIAL_ATTACK_DISARM"; break; case SPECIAL_ATTACK_FLURRY_OF_BLOWS: return "SPECIAL_ATTACK_FLURRY_OF_BLOWS"; break; case SPECIAL_ATTACK_IMPROVED_DISARM: return "SPECIAL_ATTACK_IMPROVED_DISARM"; break; case SPECIAL_ATTACK_IMPROVED_KNOCKDOWN: return "SPECIAL_ATTACK_IMPROVED_KNOCKDOWN"; break; case SPECIAL_ATTACK_INVALID: return "SPECIAL_ATTACK_INVALID"; break; case SPECIAL_ATTACK_KNOCKDOWN: return "SPECIAL_ATTACK_KNOCKDOWN"; break; case SPECIAL_ATTACK_RAPID_SHOT: return "SPECIAL_ATTACK_RAPID_SHOT"; break; case SPECIAL_ATTACK_SAP: return "SPECIAL_ATTACK_SAP"; break; case SPECIAL_ATTACK_STUNNING_FIST: return "SPECIAL_ATTACK_STUNNING_FIST"; break; } return "NONE_FOUND";}void main(){ // OnPhysicalAttacked script - tell the attacker what kind of special attack they did, if any object oAttacker = GetLastAttacker(); int nAttackType = GetLastAttackType(OBJECT_SELF); if(nAttackType != SPECIAL_ATTACK_INVALID) { SendMessageToPC(oAttacker, "You hit me with a " + GetAttackTypeString(nAttackType) + " attack!"); }}
#### See Also
constants:  |  SPECIAL_ATTACK_* Constants  

events:  |  OnPhysicalAttacked
