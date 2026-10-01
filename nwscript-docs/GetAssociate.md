<!-- Source: https://nwnlexicon.com/index.php?title=GetAssociate&amp;action=history -->

# GetAssociate(int, object, int)
Returns an object's associate. 
object GetAssociate( int nAssociateType, object oMaster = OBJECT_SELF, int nTh = 1);
#### Parameters 

nAssociateType
     ASSOCIATE_TYPE_*  

oMaster
    PC to get the associate of. (Default: OBJECT_SELF) 

nTh
    Which associate to return. (Default: 1)
#### Description
Returns the NPC associated object of oMaster of the specified oAssociateType. 
Returns OBJECT_INVALID if no such associate exists for oMaster. 
#### Remarks
The nTh parameter is useful because, since version 1.59, you can allow for more than one henchman using the SetMaxHenchmen command. The nTh parameter is thus equivalent to the nInt parameter in GetHenchman. 
You can add additional Summoned Creatures - see EffectSummonCreature - and you can also with EffectCutsceneDominated actually have multiple dominated associates. But if you do there are known issues to work around, although this function should correctly deal with them. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed GetAssociate() to honor the nAssociateIndex parameter for Dominated Associates. 
#### See Also
functions:  |   SetAssociateState  SetMaxHenchmen  

constants:  |   ASSOCIATE_TYPE_* Constants
