<!-- Source: https://nwnlexicon.com/index.php/GetIsInSubArea -->

# GetIsInSubArea(object, object)
Checks if a creature has triggered an OnEnter event 
int GetIsInSubArea( object oCreature, object oSubArea = OBJECT_SELF);
### Parameters 

oCreature
    Creature to check 

oSubArea
    Subarea to check (Default: OBJECT_SELF)
### Description
Returns TRUE if the given creature in the given subarea. Subareas are OBJECT_TYPE_TRIGGER, OBJECT_TYPE_ENCOUNTER and OBJECT_TYPE_AREA_OF_EFFECT. The Area of Effect ones may move if they're mobile. 
This function will tell you if the creature has triggered an OnEnter event for the given subarea object, and not an OnExit event which suggests that it can be used for determining if the creature is located within the space of the subarea. 
It appears that a list is maintained for objects which have entered a trigger (or perhaps any enterable object), and that when they exit they are removed from the list. If this is true, then GetIsInSubArea() simply checks to see if oCreature is still on the list for the given object. 
### Remarks
The original function description suggests that "This function will tell you if the creature has triggered an onEnter event, not if it is physically within the space of the subarea". This distinction may just be due to how the way interception of triggers and "physically large creatures" work. 
There is no way to test a given location is within a subarea; which can be frustrating for complex triggers. The best way to test it would be perhaps to create a temporary creature at the given location although this can be sometimes unreliable (eg; if they are not created at that exact location due to something else being in the way). Alternatively create a placeable object and try and use GetFirstInPersistentObject loop to find that object in the given subarea. 
Dungeon Masters appear not to trigger encounters/triggers so it may be unreliable when a DM is passed as oCreature. 
### Version
1.61 
### See Also  
---
