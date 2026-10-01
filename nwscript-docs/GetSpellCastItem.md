<!-- Source: https://nwnlexicon.com/index.php/GetSpellCastItem -->

# GetSpellCastItem()
Determines the object that caused the spell script to be called. Returns OBJECT_INVALID if not cast from an item. 
object GetSpellCastItem();
#### Description
Returns the object that cast the spell that the spell script is being executed for. 
This object will be valid until the end of the script, where the game engine removes it, or at least one casting from the item's charges. 
Therefore, object type, charges, cost, plot, anything about it can be retrieved. Most useful for Bioware's use magic device (checks if the object is a scroll). 
#### Remarks
Strictly used in scripts that resolve a spells or spell abilities effects, this function should not be used unless you are modifying how existing spells or spell abilities (scripted by Bioware and the scripts are found in scripts.bif) are implemented. 
On a side note to change the scripting of a spell one could modify the BioWare scripts for a spell or spell ability (eg. NW_S0_FLMSTRIKE for Flame Strike) and save that script within the module (or Hakpak). 
This should only be used inside spell scripts. If you want to learn how to use the new spellhooking system, check the advanced scripting tutorials in the Lexicon's Lyceum. 
**Note:** Be aware if ammunition uses On Hit: Cast Spell item properties, which fires a spell script, and the last piece of ammo is fired, the GetSpellCastItem will be OBJECT_INVALID since the projectile takes time to launch and the spell script is delayed until the projectile hits. 
#### See Also
events:  |  Spell Script
