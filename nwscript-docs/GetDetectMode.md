<!-- Source: https://nwnlexicon.com/index.php/GetDetectMode -->

# GetDetectMode(object)
Determines if a creature is currently searching. 
int GetDetectMode( object oCreature);
#### Parameters 

oCreature
    Creature to determine if it is detecting for stealthy creatures.
#### Description
Returns DETECT_MODE_* values: 
  * 0 - DETECT_MODE_PASSIVE - if oCreature is in passive (off) search mode
  * 1 - DETECT_MODE_ACTIVE - if oCreature is in active search mode
  * 2 - no constant defined - if oCreature is standing still but not in active search mode - acts as 1 - they're searching by standing around!

#### Known Bugs
Sometimes returns a 2 instead of 1. A work around appears at the bottom of the code sample. 
#### Version
1.29 
#### Example
// See if a search for a hidden item works when entering a triggerint nDC = 20; // Difficulty of search, "20" is just an exampleobject oPC = GetEnteringObject();if ( GetIsPC(oPC) ) { int nSearch = GetSkillRank( SKILL_SEARCH, oPC ); // Use only half the search value if not actively searching if ( GetDetectMode(oPC) == DETECT_MODE_PASSIVE ) { nSearch = nSearch / 2; } // Use a standard D&D style skill check if ( d20() + nSearch >= nDC ) { // Search successful - place code here  }}// fix for GetDetectMode and return value of 2// contributed by: Slow Sloshint GetDetectModeBugFix(object oCreature) { int iMode = GetDetectMode(oCreature); if(iMode == 2) {iMode = DETECT_MODE_ACTIVE;} return iMode;}
#### See Also
constants:  |   DETECT_MODE_* Constants
