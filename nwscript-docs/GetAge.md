<!-- Source: https://nwnlexicon.com/index.php/GetAge -->

# GetAge(object)
Determines the age of a creature. 
int GetAge( object oCreature);
#### Parameters 

oCreature
    Creature to get the age from.
#### Description
Returns oCreature's age and 0 if oCreature is invalid. 
#### Remarks
This can be used as a clever way to determine if a creature is a PC since NPCs do not have ages. See the addition code sample below for more information. 
Of course, GetIsPC is more useful! A PC can set their age to 0 if they wished! 
Obviously, oCreature is invalid if it is anything other then a creature. 
#### Example
// biased example for trusting a certain age group :)int TrustCreature(object oCreature){ if (GetAge(oCreature) &gt;= 30) return FALSE; // Over 30? Can't be trusted. return TRUE;}// clever way to determine if a creature is a PCint NewIsPC(object oCreature){ if (GetAge(oCreature) != 0) return TRUE; else return FALSE;}
#### See Also
functions:  |  SetAge
