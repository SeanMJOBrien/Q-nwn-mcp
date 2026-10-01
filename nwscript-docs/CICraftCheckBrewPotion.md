<!-- Source: https://nwnlexicon.com/index.php/CICraftCheckBrewPotion -->

# CICraftCheckBrewPotion(object, object)
Checks if the current spell was used to brew a potion and, if so, performs the brewing process. 
int CICraftCheckBrewPotion( object oSpellTarget, object oCaster);

### Parameters 

oSpellTarget
    The target of the spell; IGNORED - will always be set to GetSpellTargetObject() 

oCaster
    The caster of the spell; IGNORED - will always be set to OBJECT_SELF
### Description
This function is used to brew a potion. 
It checks if the caster of the spell has the necessary crafting feat (Brew Potion), the spell's level is within the range allowed for brewing potions (0-3), the spell is on the list of allowed spells for brewing potions, and the caster has enough experience points and gold to pay for the brewing process. 
If everything checks out, a new potion representing the spell is created. If the potion is created successfully, the original spell target (which is implicitly assumed to be an empty bottle) is destroyed and the appropriate amount of XP and gold is removed from the caster. 
The function always returns TRUE, which indicates to the spellhook that the spell has been used up (and consequentially the spell script should be aborted by the spellhook, even if the potion could not be created successfully). 
### Remarks
This functions is usually called from the spellhook (see x2_inc_spellhook). 
It should only be used within a spell script, otherwise its behavior is unpredictable. 
Any parameters passed to the function are ignored (see Known Bugs). 
The function always returns TRUE (even if no potion is created). 
### Known Bugs
The function ignores any parameters passed to it. It sets oCaster to OBJECT_SELF and determines oSpellTarget by calling the function GetSpellTargetObject(). 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | X2PreSpellCastCode
