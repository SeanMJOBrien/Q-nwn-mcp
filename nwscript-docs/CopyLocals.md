<!-- Source: https://nwnlexicon.com/index.php/CopyLocals -->

# CopyLocals

# CopyLocals(object, object)
Copies locals from earlier level henchmen to newer henchman 
void CopyLocals( object oSource, object oTarget);
#### Parameters
_oSource_
Previous henchman 
_oTarget_
New henchman 
#### Description
* Copies locals from the 'earlier' * level henchmen to the newer henchman. 
#### Remarks
Found in: nw_i0_henchman.nss: 378 Sets some variables on oTarget that were found on oSource. These variables are, perhaps apart from SetBeenHired, only useful in the official campaign, and there is probably little need to use this function for most of us. 
#### Requirements
#include " nw_i0_henchman " 
#### Version
1.22 
#### Example
//version 1.28 source for this functionvoid CopyLocals(object oSource, object oTarget){// AssignCommand(PC(), SpeakString("in here"));// AssignCommand(oTarget, SpeakString("I exist")); if (GetIsObjectValid(oTarget) == FALSE) { AssignCommand(PC(), SpeakString("Target invalid")); } else if (GetIsObjectValid(oSource) == FALSE) { AssignCommand(PC(), SpeakString("Source invalid")); } SetBeenHired(GetBeenHired(oSource), oTarget); SetStoryVar(1, GetStoryVar(1, oSource), oTarget); SetStoryVar(2, GetStoryVar(2, oSource), oTarget); SetStoryVar(3, GetStoryVar(3, oSource), oTarget); SetLocalInt(oTarget, "NW_ASSOCIATE_MASTER", GetLocalInt(oSource, "NW_ASSOCIATE_MASTER"));// AssignCommand(PC(),SpeakString(IntToString(GetLocalInt(oSource, "NW_ASSOCIATE_MASTER"))));// AssignCommand(PC(),SpeakString(IntToString(GetLocalInt(oTarget, "NW_ASSOCIATE_MASTER"))));}
#### See Also
functions:  |   SetBeenHired
