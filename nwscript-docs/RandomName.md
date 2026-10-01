<!-- Source: https://nwnlexicon.com/index.php?title=RandomName&amp;action=history -->

# RandomName(int)
Generates a random name. 
string RandomName( int nNameType = NAME_FIRST_GENERIC_MALE);
#### Parameters 

nNameType
     NAME_* 
#### Description
Generate a random name. 
Note that while new LTR files can be used in racialtypes.2da the list that RandomName can use is hardcoded to the default LTR files. 
#### Remarks
Use RandomName as the string inside of SetName() function to create a random name for a NPC. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed a memory leak in the RandomName() nwscript function. 
#### Example
//Use this custom function in a NPC script to set a random name if that creature is not undead or a playable race.void RandomNameNPC(object oCreature){ //Set this variable in the creatures variable properties to disable this feature if (GetLocalInt(OBJECT_SELF, "DISABLE_RANDOM_NAME") == 1) return; //If we are any of these racial types set a random name switch (GetRacialType(OBJECT_SELF)) { case RACIAL_TYPE_ABERRATION: case RACIAL_TYPE_ANIMAL: case RACIAL_TYPE_BEAST: case RACIAL_TYPE_CONSTRUCT: case RACIAL_TYPE_DRAGON: case RACIAL_TYPE_ELEMENTAL: case RACIAL_TYPE_FEY: case RACIAL_TYPE_GIANT: case RACIAL_TYPE_HUMANOID_GOBLINOID: case RACIAL_TYPE_HUMANOID_MONSTROUS: case RACIAL_TYPE_HUMANOID_ORC: case RACIAL_TYPE_HUMANOID_REPTILIAN: case RACIAL_TYPE_MAGICAL_BEAST: case RACIAL_TYPE_OOZE: case RACIAL_TYPE_OUTSIDER: case RACIAL_TYPE_SHAPECHANGER: case RACIAL_TYPE_VERMIN: SetName(OBJECT_SELF, RandomName(NAME_ANIMAL)); break; }}
#### See Also
constants:  |   NAME_* Constants
