<!-- Source: https://nwnlexicon.com/index.php/SetAssociateState -->

# SetAssociateState

# SetAssociateState(int, int)
Changes the behavior of an associate. 
void SetAssociateState( int nCondition, int bValid = TRUE);
#### Parameters
_nCondition_
 NW_ASC_* 
_bValid_
Flag the NW_ASC_* value to TRUE or FALSE (on/off). (Default: TRUE) 
#### Description
Changes one of the NW_ASC_*, NW_ASC_DISTANCE_*, NW_ASC_HEAL_AT_*, NW_ASC_AGGRESSIVE_* constant settings for an NPC associate to on (TRUE) or off (FALSE). These settings are stored and manipulated using bit arithmetic on the "NW_ASSOCIATE_MASTER" integer variable local to the NPC associate. 
#### Remarks
This function also exists in #include  x0_inc_states . The code is slightly different. 
#### Requirements
#include " x0_i0_assoc " 
#### Version
1.29 
#### See Also
functions:  |   SetAssociateStartLocation   

constants:  |   NW_ASC_* Constants
