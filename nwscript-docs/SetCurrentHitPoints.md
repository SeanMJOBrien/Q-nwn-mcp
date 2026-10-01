<!-- Source: https://nwnlexicon.com/index.php?title=SetCurrentHitPoints&amp;action=history -->

# SetCurrentHitPoints(object, int)

Sets the current hitpoints of an object. 
void SetCurrentHitPoints( object oObject, int nHitPoints);
### Parameters 

oObject
    The object to change the hitpoints of 

nHitPoints
    The hit points to set the object too. See description for limitations.
### Description
Sets the current hitpoints of oObject with these limitations: 
  * You cannot destroy or revive objects or creatures with this function.
  * For currently dying PCs, you can only set hitpoints in the range of -9 to 0.
  * All other objects need to be alive and the range is clamped to 1 and max hitpoints.
  * This is not considered damage (or healing). It circumvents all combat logic, including damage resistance and reduction.
  * This is not considered a friendly or hostile combat action. It will not affect factions, nor will it trigger script events.
  * This will not advise player parties in the combat log.

This affects plot objects, immortal objects and by extension DMs. It silently fails if there is a condition above not met. 
It also does nothing to temporary hit points effects - thusly GetCurrentHitPoints may return an odd value after using this. If you know there are no temporary hit point effects available you can safely use this with GetCurrentHitPoints. 
### Remarks
This is very usable as a function to get a creature set to specific hit point amounts bypassing all immunities, damage resistances, damage reduction and so forth that EffectDamage may encounter as well as all pain noises associated with it. It also removes the messages making it very good for adjusting hit points with script-provided feedback perhaps using SendMessageToPC and custom colours. Some uses of this may be to: 
  * Do thematic damage such as heat stroke in a desert, with a fake damage message and VFX, or damage from lack of rest/eating
  * Damage done during a cutscene, such as if being imprisoned, without having damage VFX and "ouch" noises happen
  * Self-inflicting damage amounts from new spells or feats, which sap energy
  * Inflict damage bypassing the Temporary Hit Points from any source (eg; EffectTemporaryHitpoints or EffectPolymorph)
  * Heal the object in question without feedback showing up; again for use in cutscenes or with custom feedback.
  * Damage an AI creature outside of a fight without causing them to go into combat mode when their OnDamaged event fires. It also avoids reputation changes.
  * Damage a PC out of combat without triggering the combat music / combat condition (eg; stopping rest).
  * Apply damage from a module or other source and have a fake damage message show up rather than the usual "Someone damaged you for 5 damage" kind of message.

To force a creature to less than 1 hit point you can only set it to -11 hit points (completely dead) directly using EffectDeath. This can also be hidden from the GUI. Getting to the PC's usual "dying" state however is not possible and EffectDamage must be used at some point to do this. 
### Version
This function was added in 1.81.8193.17 of NWN:EE. 
### Example
// Sets a users HP to 1, if it's possiblevoid main(){ object oUser = GetLastUsedBy(); if(GetCurrentHitPoints(oUser) > 1) { SendMessageToPC(oUser, "You drink from the water, and your health perishes as you are overcome by great thirst!"); SetCurrentHitPoints(oUser, 1); }}
### See Also
functions:  |  EffectDamage GetMaxHitPoints GetCurrentHitPoints
