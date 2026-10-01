<!-- Source: https://nwnlexicon.com/index.php/AdjustAlignmentOnAll -->

# AdjustAlignmentOnAll(object, int, int)

Adjusts the alignment of the party. 
void AdjustAlignmentOnAll( object oPC, int nAlignment, int nShift);

### Parameters 

oPC
    The character whose party will be adjusted. 

nAlignment
    The ALIGNMENT_* constant matching the axis on which to adjust the alignment. 

nShift
    The desired amount to shift the alignment (numeric range from -100 to 100).
### Description
Adjust the alignment of every member of oPC's party including associates. 
nAlignment determines the axis on which the alignment changes: 
  * ALIGNMENT_LAWFUL, ALIGNMENT_CHAOTIC, ALIGNMENT_GOOD, ALIGNMENT_EVIL: alignment will be shifted in the direction specified.
  * ALIGNMENT_ALL: nShift will be added to oSubject's law/chaos and good/evil alignment values (thus adding/subtracting the same amount to both).
  * ALIGNMENT_NEUTRAL: nShift is applied to oSubject's law/chaos and good/evil alignment values in the direction which is towards neutrality.

### Remarks
This function is a wrapper for the AdjustAlignment() function. Because of its complex behaviour, the description and remarks for that function should be examined in detail before using AdjustAlignmentOnAll(). 
Also note that x0_i0_partywide is already included in x0_i0_common, so you will only need to include one, not both. 
### Known Bugs
The behaviour of this function is not what you might expect. AdjustAlignment() already applies a 20% adjustment to every player in the party when the alignment for any PC is adjusted. As such using AdjustAlignmentOnAll() will cause each PC to have its alignment adjusted multiple times: once by nShift, then by an additional 20% for each PC in the party, and, finally, by an additional 20% for each associate the PC has. 
### Requirements
#include "x0_i0_partywide" 
### Version
1.61 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | AdjustAlignment  

constants:  | ALIGNMENT_* Constants
