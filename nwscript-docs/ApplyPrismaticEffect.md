<!-- Source: https://nwnlexicon.com/index.php/ApplyPrismaticEffect -->

# ApplyPrismaticEffect(int, object)
Applies a prismatic effect on a creature. 
int ApplyPrismaticEffect( int nEffect, object oTarget);

### Parameters 

nEffect
    Describes which effect to apply 

oTarget
    The object/creature being affected.
### Description
Applies an effect of a prismatic cone to oTarget with the appropriate saving throws are checked. Includes visual effects. 
Possible values for nEffect: 
  1. Fire
  2. Acid
  3. Electricity
  4. Poison
  5. Paralyze
  6. Confusion
  7. Death

### Remarks
Used as a support function to implement the Prismatic Spray spell. 
### Requirements
#include "nw_s0_prisspray" 
### Version
1.22 
### See Also  
---
