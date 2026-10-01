<!-- Source: https://nwnlexicon.com/index.php/ActivateFleeToExit -->

# ActivateFleeToExit()
Causes a creature to run to its exit waypoint and disappear. 
void ActivateFleeToExit();

### Description
ActivateFleeToExit will cause an NPC to flee to a waypoint called EXIT_ + <NPC's tag>, and then destroy itself, optionally respawning at its spawn-in location. 
For ActionFleeToExit to work, you must set one of these four spawn-in conditions: NW_FLAG_TELEPORT_LEAVE, NW_FLAG_TELEPORT_RETURN, NW_FLAG_ESCAPE_LEAVE or NW_FLAG_ESCAPE_RETURN. NPCs with the TELEPORT flags simply destroy themselves in an EFFECT_UNSUMMON effect. 
### Remarks
You can confirm that your NPC is flagged to use this function with GetFleeToExit(). 
When using the NW_FLAG_ESCAPE_RETURN option, it is an absolute requirement that the TAG of your NPC is 100% identical to its resref. As can be seen in nw_i0_generic.nss, the ActivateFleeToExit() function uses CreateSignPostNPC() (with the TAG as argument) to respawn the npc. However, that function requires the resref, and will not work at all with a tag! So if an NPC's resref is "halfling016", then the NPC's tag must be "halfling016", otherwise the NPC will flee and disappear, but never return! 
### Requirements
#include "nw_i0_generic" 
### Version
1.26 
### Example
// In an OnPerception event, a scared NPC runs away.#include "nw_i0_generic"void main() { ActivateFleeToExit();}
### See Also
functions:  |  GetFleeToExit   

constants:  | NW_FLAG_* Constants
