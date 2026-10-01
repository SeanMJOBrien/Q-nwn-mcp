<!-- Source: https://nwnlexicon.com/index.php/GetPhenoType -->

# GetPhenoType

# GetPhenoType(object)
Returns the creature's currently set PhenoType (body type). 
int GetPhenoType( object oCreature);
#### Parameters
_oCreature_
The creature to check the phenotype of 
#### Description
This will return the creature's currently set PhenoType (body type). The valid constants are PHENOTYPE_BIG, PHENOTYPE_NORMAL, and PHENOTYPE_CUSTOM. 
#### Remarks
Note that a phenotype is only valid for the default 7 PC races (Dwarf, Human, Half Elf, Half Orc, Elf, Gnome and Halfling). It is basically the "Fat/Thin" option given when you create your character, however, custom content creators can have a better and more varied use for it as there will no doubt be. 
#### Version
1.64 
#### Example
// If the PC's phenotype is big, we comment on it, in a conversationvoid main(){ // PC speaker object oPC = GetPCSpeaker(); if(GetPhenoType(oPC) == PHENOTYPE_BIG) { // Comment on it dramatically and respectfully, as a Halfling might SpeakString("oooh, we got a well-fed kind of a person here, ain't we!"); }}
#### See Also
functions:  |   SetPhenoType   

constants:  |   PHENOTYPE_* Constants
