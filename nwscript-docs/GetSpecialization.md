<!-- Source: https://nwnlexicon.com/index.php?title=GetSpecialization&amp;action=history -->

# GetSpecialization(object, int)

Returns the spell school specialization of oCreature. 
int GetSpecialization( object oCreature, int nClass = CLASS_TYPE_WIZARD);
### Parameters 

oCreature
    The creature object to query. 

nClass
    The class to query for a spell specialization school.
### Description
Returns oCreature's spell school specialization in nClass (SPELL_SCHOOL_* constants). 
Unless custom content is used, only Wizards have spell schools. 
Returns -1 on error. (See remarks) 
### Remarks
You can actually have specializations on a NPC but this requires either GFF edits (and not loading the blueprint in the toolset, which wipes them) or using json to load a template and alter it before spawning a creature in. 
This function returns -1 on an errors such as if checking for CLASS_TYPE_WIZARD when oCreature does not have that class. However, if checking for a class that does not have specialization, it will return 0. I.E. Checking GetSpecialization(oCreature, CLASS_TYPE_FIGHTER) when the creature has no fighter levels returns -1, but when they have fighter levels it returns 0. To differentiate this from SPELL_SCHOOL_GENERAL either A) only GetSpecialization on classes that actually have Specializations or B) also Get2DAString the classes.2da PickSchool column and compare to "1" 
### Version
This function was added in 1.74.8193.8 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  |   GetDomain  

constants:  |   SPELL_SCHOOL_* Constant Group
