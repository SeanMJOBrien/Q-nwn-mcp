<!-- Source: https://nwnlexicon.com/index.php/AutoAlignE -->

# AutoAlignE(int, object)
Adjusts the alignment of the object towards evil, relative to the degree indicated. 
void AutoAlignE( int nDC, object oTarget);

### Parameters 

nDC
    A DC_* constant representing the relative difficulty of the task (should be DC_EASY, DC_MEDIUM, or DC_HARD). 

oTarget
    The creature whose alignment will be changed.
### Description
Adjusts the alignment of the object towards evil, relative to the degree indicated. 
### Remarks
This is a wrapper for AdjustAlignment(). 
The amount shifted depends on the DC given: 
  * DC_EASY is 3 point shift
  * DC_MEDIUM is a 7 point shift
  * DC_HARD is a 10 point shift

### Requirements
#include "nw_i0_plot" 
### Version
1.22 
### See Also
constants:  | DC_* Constants
