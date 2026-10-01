<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomImmobile -->

# AnimActionPlayRandomImmobile()
Perform a strictly immobile action. 
void AnimActionPlayRandomImmobile();

### Description
Perform a strictly immobile action. 
Possible actions include: 
  * Turn towards a nearby unoccupied friend and "talk".
  * Turn towards a nearby placeable and interact.
  * Turn around randomly.
  * Play a random animation.

### Remarks
Uses a random 12 plus other particulars to determine what to do. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### Example
// If the last thing the NPC perceived is a PC, then have the NPC look busy.// This script should go in the NPC's OnPerception event.#include "x0_i0_anims"void main(){ object oPC = GetLastPerceived(); if (GetIsPC(oPC)) { AnimActionPlayRandomImmobile(); } }
### See Also
functions:  | AnimActionPlayRandomMobile
