<!-- Source: https://nwnlexicon.com/index.php/CICraftCheckScribeScroll -->

# CICraftCheckScribeScroll(object, object)
Checks if the current spell was used to scribe a scroll and performs the scribe process. 
int CICraftCheckScribeScroll( object oSpellTarget, object oCaster);

### Parameters 

oSpellTarget
    The target target of the spell (should be an empty scroll) 

oCaster
    The caster of the spell (should be OBJECT_SELF)
### Description
This function is used to scribe a scroll. 
It checks if the presumed caster of the spell (oCaster) has the necessary crafting feat (Scribe Scroll), the spell is on the list of allowed spells for scribing scrolls, and oCaster has enough experience points and gold to pay for the scribe process. 
If everything checks out, a new scroll representing the current spell is created. If the scroll is created successfully, oSpellTarget (which is implicitly assumed to be an empty scroll) is destroyed and the appropriate amount of XP and gold is removed from oCaster. 
The function always returns TRUE, which indicates to the spellhook that the spell has been used up (and consequentially the spell script should be aborted by the spellhook, even if the scroll could not be created successfully). 
### Remarks
This functions is usually called from the spellhook (see x2_inc_spellhook). 
It should only be used within a spell script, otherwise its behavior is unpredictable. 
The function always returns TRUE (even if no scroll is created). 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | X2PreSpellCastCode
