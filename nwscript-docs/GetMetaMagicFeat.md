<!-- Source: https://nwnlexicon.com/index.php?title=GetMetaMagicFeat&amp;action=history -->

# GetMetaMagicFeat()
Get the type of metamagic used on the last spell. 
int GetMetaMagicFeat();
#### Description
Returns an integer corresponding to the METAMAGIC_* constant describing which metamagic was used on the last spell cast. This value should remain the same until another spell has been cast. The function will return a value of -1 if the caster is not a valid object. 
Can be used in a Spell Script or an Area of Effects OnEnter, OnExit or OnHeartbeat
#### Remarks
This is called from an object who cast a spell. Epic-level Automatic feats do not show up with this (As this can only return 1 value). 
It works fine after another spell is cast if used in an Area of Effects scripts, saving the correct value (eg; Empower). 
#### Version
1.22 
#### Example
// OnHeartbeat this will tell you if you have used metamagic.void main(){ if(GetMetaMagicFeat() == METAMAGIC_ANY) SendMessageToPC(OBJECT_SELF,"YOU USED METAMAGIC ON LAST SPELL");}
#### See Also
constants:  |   METAMAGIC_* Constants
