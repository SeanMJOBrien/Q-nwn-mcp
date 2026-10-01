<!-- Source: https://nwnlexicon.com/index.php/SetPhenoType -->

# SetPhenoType(int, object)
Sets the creature's PhenoType (body type) to the type specified. 
void SetPhenoType( int nPhenoType, object oCreature = OBJECT_SELF);
#### Parameters 

nPhenoType
    The creature's PhenoType (body type) to be changed to - PHENOTYPE_* constants, a reference to phenotype.2da 

oCreature
    The creature to change the PhenoType of. (Default: OBJECT_SELF)
#### Description
Sets the creature's PhenoType (body type) to the type specified. 
nPhenoType has several valid values: 
  * nPhenoType = PHENOTYPE_NORMAL (0)
  * nPhenoType = PHENOTYPE_BIG (2)
  * nPhenoType = PHENOTYPE_CUSTOM1 (3) through PHENOTYPE_CUSTOM18 (20) - The custom PhenoType should only ever be used if you have specifically created your own custom content that requires the use of a new PhenoType and you have specified the appropriate custom PhenoType in your custom content. SetPhenoType will only work on part based creature (i.e. the starting default playable races).

Note while the constants only go up to CUSTOM18 you can use more lines in phenotype.2da, maybe up to line 255 (0-255) or at least 0 through 99 will work. 
1.69 added horses phenotypes to the game (should also be used with new appearance.2da lines if you use these for the animations to properly line up): 
  * 3 - Normal sized mounted on horse
  * 5 - Large sized mounted on horse
  * 6 - Normal sized mounted on jousting horse
  * 7 - Large sized mounted on jousting horse

The game originally was going to have a "skinny" phenotype (1) which is not available in the final game. Horse phenotypes leave gaps for it however. 
#### Remarks
Note that by default a phenotype is only valid for the default 7 PC races (Dwarf, Human, Half Elf, Half Orc, Elf, Gnome and Halfling - although Half-Elf copies the Human one). 
It is basically the "Fat/Thin" option given when you create your character, however, custom content creators can have a better and more varied use for it as there will no doubt be. 
NWN:EE allows with ruleset.2da changes limits on what phenotypes are available to players at chargen (so for instance horse phenotypes are not displayed but others can be). 
#### Version
1.64 
#### Example
// Sets the PC's phenotype, in a conversation (maybe some // growth-type one) to the big version.void main(){ // Get the PC to change object oPC = GetPCSpeaker(); // Set the phenotype SetPhenoType(PHENOTYPE_BIG, oPC);}
#### See Also
functions:  |  GetPhenoType SetCreatureAppearanceType  

constants:  |   PHENOTYPE_* Constants
