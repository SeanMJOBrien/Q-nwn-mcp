<!-- Source: https://nwnlexicon.com/index.php/BringBack -->

# BringBack()
Brings a NPC back to life and transports them to a location. 
void BringBack();

### Description
Brings a NPC back to life and transports them to a location. 
### Remarks
This is a support function to bring back dead Henchmen. This function should not be used in general scripting. 
### Requirements
#include "nw_ch_ac7" 
### Version
1.22 
### Source
// 1.24 source for this functionvoid BringBack(){ SetLocalObject(OBJECT_SELF,"NW_L_FORMERMASTER", GetMaster()); // : REMINDER: The delay is here for a reason DelayCommand(0.1, RemoveEffects(OBJECT_SELF)); DelayCommand(0.2, ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectResurrection(), OBJECT_SELF)); DelayCommand(0.3, ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectHeal(GetMaxHitPoints(OBJECT_SELF)), OBJECT_SELF)); DelayCommand(5.1, SetIsDestroyable(TRUE, TRUE, TRUE)); object oWay = GetObjectByTag("NW_DEATH_TEMPLE"); if (GetIsObjectValid(oWay) == TRUE) { // * if in Source stone area, respawn at opening to area if (GetTag(GetArea(OBJECT_SELF)) == "M4Q1D2") { DelayCommand(0.2, JumpToObject(GetObjectByTag("M4QD07_ENTER"), FALSE)); } else DelayCommand(0.2, JumpToObject(oWay, FALSE)); } else DelayCommand(0.3, ActionSpeakString("UT: No place to go"));}
### See Also  
---
