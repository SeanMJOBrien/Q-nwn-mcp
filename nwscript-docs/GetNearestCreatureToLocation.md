<!-- Source: https://nwnlexicon.com/index.php/GetNearestCreatureToLocation -->

# GetNearestCreatureToLocation

# GetNearestCreatureToLocation(int, int, location, int, int, int, int, int)
Gets the nearest creature, which matches supplied criteria, to a given location. 
object GetNearestCreatureToLocation( int nFirstCriteriaType, int nFirstCriteriaValue, location lLocation, int nNth = 1, int nSecondCriteriaType = -1, int nSecondCriteriaValue = -1, int nThirdCriteriaType = -1, int nThirdCriteriaValue = -1);
#### Parameters
_nFirstCriteriaType_
CREATURE_TYPE_* (see description below for details) 
_nFirstCriteriaValue_
CLASS_TYPE_*, SPELL_*, PERCEPTION_*, PLAYER_CHAR_IS_PC, PLAYER_CHAR_NOT_PC , RACIAL_TYPE_* , REPUTATION_TYPE_*, TRUE OR FALSE (value is dependent on nFirstCriteriaType, see function description below for details) 
_lLocation_
We're trying to find the creature of the specified type that is nearest to lLocation 
_nNth_
We don't have to find the first nearest: we can find the Nth nearest.... (Default: 1) 
_nSecondCriteriaType_
This is used in the same way as nFirstCriteriaType to further specify the type of creature that we are looking for. (Default: -1) 
_nSecondCriteriaValue_
This is used in the same way as nFirstCriteriaValue to further specify the type of creature that we are looking for. (Default: -1) 
_nThirdCriteriaType_
This is used in the same way as nFirstCriteriaType to further specify the type of creature that we are looking for. (Default: -1) 
_nThirdCriteriaValue_
This is used in the same way as nFirstCriteriaValue to further specify the type of creature that we are looking for. (Default: -1) 
#### Description
Get the creature nearest to lLocation, subject to all the criteria specified. Return value on error: OBJECT_INVALID The function selects the Nth (default is 1, or the nearest) nearest creature to the given location that matches the supplied criteria. By default the oTARGET is equal to OBJECT_SELF but may be set to another object. The first set of criteria (nFirstCriteriaType & nFirstCriteriaValue) is required as is a parameter of type location. The second and third sets of criteria are optional and are used to narrow down the object search. Criteria parameters are paired by type and values, and only accept constant group values. For example, if int nFirstCriteriaType is equal to CREATURE_TYPE_CLASS then nFirstCriteriaValue should be of the form CLASS_TYPE_*. So in this example, the parameters (CREATURE_TYPE_CLASS, CLASS_TYPE_CLERIC, lLoc1) would return an object that is the nearest cleric to location lLoc1. The following parameters would be more specific then the above example by not only finding the nearest cleric to lLoc1 but the nearest cleric that is a dwarven PC to lLoc1: (CREATURE_TYPE_CLASS, CLASS_TYPE_CLERIC, lLoc1, CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC, CREATURE_TYPE_RACIAL_TYPE, RACIAL_TYPE_DWARF). The following list shows the criteria types that may be used and the values associated with those types (type value). CREATURE_TYPE_CLASS CLASS_TYPE_* CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT SPELL_* CREATURE_TYPE_HAS_SPELL_EFFECT SPELL_* CREATURE_TYPE_IS_ALIVE TRUE OR FALSE CREATURE_TYPE_PERCEPTION PERCEPTION_* CREATURE_TYPE_PLAYER_CHAR PLAYER_CHAR_IS_PC OR PLAYER_CHAR_NOT_PC CREATURE_TYPE_RACIAL_TYPE RACIAL_TYPE_* CREATURE_TYPE_REPUTATION REPUTATION_TYPE_* To see the entire list of criteria value constants available, enter one the above value fragments (i.e. SPELL_) into the Aurora editor filter and select the Constants button. 
#### Remarks
Note that the reputation type is applied as if GetIsFriend(oTarget, OBJECT_SELF) and similar functions were used. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

ShadoOow has done additional testing in v1.69 and NWNEE in March of 2020. His notes from the Neverwinter Vault #building-scripting Discord channel follow: 
In v1.69, if you use CREATURE_TYPE_REPUTATION condition (and the perception probably as well) then it behaves really weird: for example if you pass this into location parameter... 
```
  oTarget = GetNearestCreatureToLocation( CREATURE_TYPE_REPUTATION,REPUTATION_TYPE_ENEMY, GetLocation( oSource ) );

```

...the game will use oSource as a creature for the reputation/perception checks. 
If, however, you do this... 
```
  location lLoc = GetLocation( oSource );
  oTarget = GetNearestCreatureToLocation( CREATURE_TYPE_REPUTATION, REPUTATION_TYPE_ENEMY, lLoc );

```

...it crashes the game. 
In NWNEE, the crash is fixed and the function will return OBJECT_INVALID if you use the REPUTATION/PERCEPTION condition regardless of how you pass the location parameter. 
#### Known Bugs
1.64 means this should now more consistently return the nearest object. 
When passed CREATURE_TYPE_REPUTATION or CREATURE_TYPE_PERCEPTION as a parameter function will crash the game. 
#### Version
1.64 
#### See Also
functions:  |   GetNearestCreature   

constants:  |   SPELL_* Constants
