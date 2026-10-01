<!-- Source: https://nwnlexicon.com/index.php/SetEventScript -->

# SetEventScript(object, int, string)

Sets the given event script for the given object and handler. 
int SetEventScript( object oObject, int nHandler, string sScript);
### Parameters 

oObject
    The object to set the event script on. 

nHandler
    An  EVENT_SCRIPT_* constant matching the event to set the script on. 

sScript
    The script to attach to the event.
### Description
Sets the given event script for the given object and handler. 
Returns 1 on success, 0 on failure. 
Will fail if oObject is invalid or does not have the requested handler. 
### Remarks
This also works on PCs with all events except OnRested which is covered by the module OnPlayerRest event. There are some caveats; 
  * OnBlocked - If using an ActionMoveToObject it won't cancel so this event may fire frequently if no actions are taken in it (eg ClearAllActions).
  * OnCombatRoundEnd - Fires as usual.
  * OnConversation - Does not fire when a PC talks to another NPC, but will if an NPC talks to them. If overriden breaks the crafting menu since the default conversation script fires for PCs usually (which loads the conversation properly).
  * OnDamaged - Fires as usual.
  * OnDeath - Fires before the module OnPlayerDeath event (and only at -11 HP, so doesn't know you're dying)
  * OnDisturbed - If it fires (ie the attempt is detected) it will fire a good while after the "Creature is attempting to steal from you!" message, but just after the item is removed if any was removed. Note a PCs items by default can be all stolen from.
  * OnHeartbeat - Fires as usual.
  * OnPerception - Fires as usual (and therefore quite a lot given how many things PCs see).
  * OnPhysicalAttacked - Fires as usual.
  * OnRested - Doesn't fire at all. Use OnPlayerRest instead.
  * OnSpawn - Of course won't fire, PCs don't spawn in, recommended to use OnClientEnter or similar instead.
  * OnSpellCastAt - Fires as usual.
  * OnUserDefined - Fires as usual.

PC event scripts may also run quite a lot more than NPC ones, so be check for lag if you use them extensively. The good news about the above is you could have the AI scripts run the player almost entirely (besides the rest event). 
DMs have kind of weird interactions with creature event scripts. When possessing and unpossessing creatures they might blank or reset scripts (so any changes to that NPC may not take). If they turn off AI of a creature it will blank the scripts (and again restore to pre-blanked state possibly overriding changes). Mainly this points to a persistent world or DM run module to not make too much use of this on NPCs, since they should really already have AI scripts attached (simply add extra behaviour there or using User Defined Events). This also applies to familiars - they can be possessed similar to DM possession by their master. Since PCs cannot be possessed or have their "AI" disabled, this shouldn't be a problem for PC objects. 
If a script is cleared (by using a blank parameter) you can unset that script and it will just not ever fire (as if it was never set). This is particularly useful for either toggling, or single firing, a heartbeat script. See the code example. Note that two events - OnConversation and OnClick/OnAreaTransitionClick run a default script if left blank (which is usually a good thing). 
From testing PCs have scripts actually set to the word "default" by default - any changes made are not saved to a .bic file. **Therefore be careful you do not create a script called "default" since it might run many times in creature events you don't expect!**
It also means the GetEventScript will never return a blank entry for a PC unless specifically set using SetEventScript. 
### Version
This function was added in 1.74.8164 of NWN:EE. 
Further bugfixes were made after this patch. 
### Example
// Thanks to Clippy for this great example!// This script is a perfect example of a fire-and-forget placeable OnHeartbeat script.// It will apply the visual effect ID stored in local variable "vfx" (set in the toolset)// Then it will remove the event script from the heartbeat so it never fires again.// This is efficient - it will fire the first heartbeat "when ready" (lazily, especially if it's in an area the player isn't) and then never fire it ever again.void main() { int vfx = GetLocalInt(OBJECT_SELF, "vfx"); if (vfx) ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectVisualEffect(vfx), OBJECT_SELF); SetEventScript(OBJECT_SELF, EVENT_SCRIPT_PLACEABLE_ON_HEARTBEAT, "");}
### See Also
functions:  | GetEventScript()   

constants:  |  EVENT_SCRIPT_* Constant Group
