<!-- Source: https://nwnlexicon.com/index.php/ActionPsionicCharm -->

# ActionPsionicCharm(object)
Attempts a confusion attack on target. 
void ActionPsionicCharm( object oSpellTarget);

### Parameters 

oSpellTarget
    The object target of the action.
### Description
The target must make a will save with a DC of 17 or be confused for 4 rounds. 
### Remarks
This function will attempt a confusion on all creatures within a cone shaped spell out to 10 meters. 
This function apparently used to do a charm effect. Looking the script over, it does indeed do confusion and not charm. 
### Requirements
#include "inc_mf_combat" 
### Version
??? 
### Example
// Will cast cone shaped stun effect out to 10 meters.#include "inc_mf_combat"void main(){ // Obtain oTarget, and attempt spell on it. object oTarget = GetLastHostileActor(); ActionPsionicCharm(oTarget);}
### See Also
functions:  | GetLastHostileActor()
