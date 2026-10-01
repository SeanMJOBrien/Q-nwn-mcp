<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomMobile -->

# AnimActionPlayRandomMobile()
Perform a mobile action. 
void AnimActionPlayRandomMobile();

### Description
Perform a mobile action. 
Possible actions include: 
  * Walk to an NW_STOP waypoint in the area.
  * Walk to an area door and possibly go inside.
  * Go outside if previously went inside.
  * Fall through to AnimActionPlayRandomCloseRange().

### Remarks
Uses a random 9 plus other particulars to determine what to do. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### Example
// If the last thing the NPC perceived is a PC, the have the NPC look busy.// This script should go in the NPC's OnPerception event.#include "x0_i0_anims"void main(){ object oPC = GetLastPerceived(); if (GetIsPC(oPC)) { AnimActionPlayRandomMobile(); } }
### See Also
functions:  | AnimActionPlayRandomImmobile
