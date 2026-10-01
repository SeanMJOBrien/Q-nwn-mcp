<!-- Source: https://nwnlexicon.com/index.php/ActionPsionicMB -->

# ActionPsionicMB(object)
Attempts a stun attack in a cone shaped spell out to 15.0 meters. 
void ActionPsionicMB( object oSpellTarget);

### Parameters 

oSpellTarget
    The target of the spell function.
### Description
Attempts a stun attack in a cone shaped spell out to 15.0 meters.Anyone caught in the cone out to 15.0 meters, must make a Will save (DC 17) or be stunned for 3d4 rounds. 
### Requirements
#include "inc_mf_combat" 
### Version
??? 
### Example
// This function will cast a cone shaped spell out to 15 meters.#include "inc_mf_combat"void main(){ // Get object oTarget and cast spell at it. object oTarget = GetLastHostileActor(); ActionPsionicMB(oTarget);}
### See Also
functions:  |  GetLastHostileActor()
