<!-- Source: https://nwnlexicon.com/index.php/GetNearestCreature -->

# GetNearestCreature(int, int, object, int, int, int, int, int)
Determines the nearest creature to a target object. 
object GetNearestCreature( int nFirstCriteriaType, int nFirstCriteriaValue, object oTarget = OBJECT_SELF, int nNth = 1, int nSecondCriteriaType = -1, int nSecondCriteriaValue = -1, int nThirdCriteriaType = -1, int nThirdCriteriaValue = -1);
#### Parameters 

nFirstCriteriaType
    CREATURE_TYPE_* (see description below for more details) 

nFirstCriteriaValue
    CLASS_TYPE_*, SPELL_*, PERCEPTION_*, PLAYER_CHAR_IS_PC, PLAYER_CHAR_NOT_PC , RACIAL_TYPE_* , REPUTATION_TYPE_*, TRUE OR FALSE (value is dependent on nFirstCriteriaType, see function description below for details) 

oTarget
    We're trying to find the creature of the specified type that is nearest to oTarget (Default: OBJECT_SELF) 

nNth
    We don't have to find the first nearest: we can find the Nth nearest. Starts counting from 1. (Default: 1) 

nSecondCriteriaType
    This is used in the same way as nFirstCriteriaType to further specify the type of creature that we are looking for. (Default: -1) 

nSecondCriteriaValue
    This is used in the same way as nFirstCriteriaValue to further specify the type of creature that we are looking for. (Default: -1) 

nThirdCriteriaType
    This is used in the same way as nFirstCriteriaType to further specify the type of creature that we are looking for. (Default: -1) 

nThirdCriteriaValue
    This is used in the same way as nFirstCriteriaValue to further specify the type of creature that we are looking for. (Default: -1)
#### Description
Get the creature nearest to oTarget, subject to all the criteria specified. 
Return value on error: OBJECT_INVALID 
The function selects the Nth (default is 1, or the nearest) creature that matches the given criteria. By default the oTARGET is equal to OBJECT_SELF but may be set to another object. The first set of criteria (nFirstCriteriaType and nFirstCriteriaValue) is required. The second and third sets of criteria are optional. 
Criteria parameters are paired by type and values, and only accept constant group values. For example, if int nFirstCriteriaType is equal to CREATURE_TYPE_CLASS then nFirstCriteriaValue should be of the form CLASS_TYPE_*. So in this example, the parameters (CREATURE_TYPE_CLASS, CLASS_TYPE_CLERIC) would return the nearest creature that was of class cleric. For a complete list of type/value constant pairings, see the end of this description. 
You can further specify the type of creature that you are looking for by using the second and third criteria type/value pairs. For example, (CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC, CREATURE_TYPE_IS_ALIVE, TRUE, CREATURE_TYPE_RACIAL_TYPE, RACIAL_TYPE_DWARF) would return the nearest creature that is first a player character, second is alive, and third a dwarf. 
The following list shows the criteria types that may be used and the values associated with those types (type value). 
  * CREATURE_TYPE_CLASS - CLASS_TYPE_*
  * CREATURE_TYPE_HAS_SPELL_EFFECT - SPELL_* "Spell \(constant group\)")
  * CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT - SPELL_* "Spell \(constant group\)")
  * CREATURE_TYPE_IS_ALIVE - TRUE OR FALSE
  * CREATURE_TYPE_PERCEPTION - PERCEPTION_*
  * CREATURE_TYPE_PLAYER_CHAR - PLAYER_CHAR_IS_PC OR PLAYER_CHAR_NOT_PC (which are aliased to TRUE and FALSE)
  * CREATURE_TYPE_RACIAL_TYPE - RACIAL_TYPE_*
  * CREATURE_TYPE_REPUTATION REPUTATION_TYPE_*

To see the entire list of criteria value constants available, enter one the above value fragments (i.e. SPELL_) into the Aurora editor filter and select the Constants button. 
#### Remarks
It will filter out DM objects even if CREATURE_TYPE_PLAYER_CHAR is used. This is why certain spells don't even appear to target DMs at all. 
Note that the reputation type is applied as if GetIsFriend(oCheckedObject, OBJECT_SELF) and similar functions were used, not the oTarget's reputation. 
The function itself isn't necessarily the fastest in large areas since it re-creates the array used to find the objects matching the criteria each time (it doesn't log a position it got to last time) but it is at least simple; and filters out non-creature objects. A more complicated loop can be done with GetFirstObjectInArea / GetNextObjectInArea which can be much faster for larger areas. The equivalent script function calls would be: 
  * CREATURE_TYPE_CLASS - GetLevelByClass
  * CREATURE_TYPE_HAS_SPELL_EFFECT - GetHasSpellEffect or a loop of effects using GetFirstEffect and GetNextEffect
  * CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT -  or a loop of effects using GetFirstEffect and GetNextEffect
  * CREATURE_TYPE_IS_ALIVE - 
  * CREATURE_TYPE_PERCEPTION - GetObjectSeen, GetObjectHeard or a mixture of the two.
  * CREATURE_TYPE_PLAYER_CHAR - GetIsPC
  * CREATURE_TYPE_RACIAL_TYPE - GetRacialType
  * CREATURE_TYPE_REPUTATION - GetIsEnemy, GetIsFriend or GetIsNeutral etc.

#### Known Bugs
Prior to patch 1.28, this function always returned OBJECT_INVALID when the first and only criteria specified was CREATURE_TYPE_IS_ALIVE. 
#### Version
1.28 
### Example
// Sends a message to the nearest PC who is alive to us.void main(){ object oPC = GetNearestCreature(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC, OBJECT_SELF, 1, CREATURE_TYPE_IS_ALIVE, TRUE); SendMessageToPC(oPC, "Hello there alive PC!");}
#### See Also
functions:  |  GetNearestObjectToLocation , GetNearestCreature, GetNearestCreatureToLocation, GetNearestObjectByTag  

constants:  |   SPELL_* Constants
