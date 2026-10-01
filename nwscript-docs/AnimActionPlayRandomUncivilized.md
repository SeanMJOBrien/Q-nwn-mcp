<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomUncivilized -->

# AnimActionPlayRandomUncivilized()
Perform a mobile action for an uncivilized creature. 
void AnimActionPlayRandomUncivilized();

### Description
Perform a mobile action for an uncivilized creature. 
Possible actions include: 
  * Perform random limited animations.
  * Talk to an NW_STOP waypoint in the area.
  * Random walk if none available.

### Remarks
Uses a random 6. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### Example
// Do random animation for an uncivilized critter when they perceive a player.// This script should go in the NPC's OnPerception event.#include "x0_i0_anims"void main(){ object oPC = GetLastPerceived(); if (GetIsPC(oPC)) { AnimActionPlayRandomUncivilized(); }}
### See Also
functions:  | AnimActionPlayRandomMobile
