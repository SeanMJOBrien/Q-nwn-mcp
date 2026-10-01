<!-- Source: https://nwnlexicon.com/index.php/ActionCounterSpell -->

# ActionCounterSpell(object)
Causes the caller to enter the counterspell modal combat mode. 
void ActionCounterSpell( object oCounterSpellTarget);
### Parameters 

oCounterSpellTarget
    Object to enter counterspell combat mode against.
### Description
Causes the calling creature to enter the counterspell modal combat mode, waiting for oCounterSpellTarget to cast a spell. 
### Remarks
If the calling creature has any action assigned to it after calling this function, the counterspell mode will be cancelled. 
Certain criteria must be fulfilled before the calling creature can enter counterspell mode and attempt to counterspell oCounterSpellTarget: 
  * It must have levels in a class capable of spellcasting before it is able to use the counterspell mode.
  * It must have high enough level in Spellcraft (SKILL_SPELLCRAFT) to recognize the spell oCounterSpellTarget is trying to cast.
  * It must have an applicable spell which will be consumed in the counterspell attempt. (For more information on counterspelling, read page 109 of the NWN manual or see the NWN Wiki.)

A counterspell is not guaranteed to succeed, even if all of the above conditions are met. 
Also note that counterspell mode counts as a ready action, which means that it will only take effect just before the start of an opponent's round. Starting counterspell mode while an opponent is casting a spell will not trigger a counterspell attempt. 
AI creatures will clear the action modes including counterspell just as OnCombatRoundEnd fires so to keep counterspelling you need to call this action again. 
### Version
1.22 
### See Also
functions:  | ActionCastSpellAtObject
