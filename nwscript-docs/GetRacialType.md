<!-- Source: https://nwnlexicon.com/index.php/GetRacialType -->

# GetRacialType

# GetRacialType(object)
Determines the race of a creature. 
int GetRacialType( object oCreature);
#### Parameters
_oCreature_
The creature whose race we are interested in. 
#### Description
Returns the racial type (RACIAL_TYPE_*) of oCreature and RACIAL_TYPE_INVALID If oCreature is invalid. 
#### Remarks
this is most useful, no, the best function, if only, for getting their race. It merely returns a value from the racialtypes.2da file, and so new races can be added in successfully. This is widely used in most conversations, and places where race relations comes into play. Giving a special conversation option to certain races, and getting NPC's to react according to race, it usually a good way to add some depth to a world. 
#### Known Bugs
1.64 makes sure that RACIAL_TYPE_INVALID is returned for any invalid object type when using this function. 
#### Version
1.64 
#### Example
// Area transition script// Dwarves go to "MORIA",// Everybody else goes to the default transition// (I know, stupid example, but still...)void main(){ object oPC=GetClickingObject(); object oTarget; if (GetRacialType(oPC)==RACIAL_TYPE_DWARF) { oTarget = GetObjectByTag("MORIA"); } else { oTarget = GetTransitionTarget(OBJECT_SELF); } AssignCommand(oPC, JumpToObject(oTarget));}
#### See Also
constants:  |   RACIAL_TYPE_* Constants
