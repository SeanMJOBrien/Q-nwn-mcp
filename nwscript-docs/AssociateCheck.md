<!-- Source: https://nwnlexicon.com/index.php/AssociateCheck -->

# AssociateCheck(object)
Returns whether an object is an henchman or not. 
int AssociateCheck( object oCheck);

### Parameters 

oCheck
    The object whose henchman status you want to determine.
### Description
This is a function in the generic AI script, used as part of the determination of the number of friendly creatures in an area. 
### Remarks
As the code below shows, AssociateCheck wraps GetAssociate with an object comparison. GetAssociate may be clearer to use in your scripts. 
### Requirements
#include "x0_i0_assoc" 
### Version
1.22 
### Example
// This is the AssociateCheck code from x0_i0_assocint AssociateCheck(object oCheck){ object oHench = GetAssociate (ASSOCIATE_TYPE_HENCHMAN); if(oCheck != oHench) { return TRUE; } return FALSE;}
### See Also
functions:  | GetAssociate
