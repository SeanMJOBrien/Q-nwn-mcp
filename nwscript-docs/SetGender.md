<!-- Source: https://nwnlexicon.com/index.php/SetGender -->

# SetGender(object, int)

Set the gender of oCreature. 
void SetGender( object oCreature, int nGender);
#### Parameters 

oCreature
    The object to set the gender for. 

nGender
    The gender to apply to oCreaturr, a GENDER_* constant.
#### Description
Set the gender of oCreature. 
#### Remarks
This will update the appearance of the creature on the client - take mind of the fact while most parts of a creature will be fine, the head usually won't necessarily mirror well. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  GENDER_* Constants   

functions:  | GetGender()
