<!-- Source: https://nwnlexicon.com/index.php/EffectDisease -->

# EffectDisease(int)
Create a Disease effect. 
effect EffectDisease( int nDiseaseType);
#### Parameters 

nDiseaseType
    The type of disease this effect should apply, chosen from DISEASE_* constant group (line from disease.2da).
#### Description
Returns a new effect object that when applied to a target will cause them to be diseased. The disease can be chosen from the DISEASE_* constants group. 
Diseases' specifications can be looked at in the 2da array file called "disease.2da". Diseases applied from On Hit effects are Extraordinary or Supernatural, so cannot be dispelled. By default this one of the few effects which _defaults_ to Supernatural. 
Please note that no more then one disease can be applied to a target at once - whether from a creature weapon (EG: mummy hit) or a script. However more can be applied once the payload occurs. 
The target this effect is applied to must be a creature for it to work. This effect cannot be applied instantly or temporarily, only permanently. 
#### Remarks
You do not need to change their subtype - as noted, it is already specified. 
You should always apply it permanently - else the incubation and natural decline and effects of it may not work correctly. 
Advancing the time (IE: SetTime) will speed up "incubation". Resting also counts as a "Personal" advancement of 24 hours on the PC, and so saves are made instantly. It is personal because Resting will not advance the game clock, only the PC's effects are affected. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
For more information on disease.2da and the disease functionality see disease.2da. This breakdown will cover the effect integers and a simple overview. 
It can only be applied to a target which has no EFFECT_TYPE_DISEASE already existing. 
The first save occurs. If saved, the disease is not applied, and if failed, it will apply and incubate - the incubation time is usually 1 in game hour. 
After that 1 hour the payload/incubation save occurs. 
  * If saved, the disease is resisted; it hasn't been removed.
  * If failed, it applies the payload EffectAbilityDecrease from data in disease.2da and the incubation script will fire (this is the only time the incubation script can fire). 
    * The EffectAbilityDecrease follows the parent diseases creator, spell ID and subtype (supernatural or extraordinary).

A 24 hour timer is added after the first incubation whereupon another save is done: 
  * If saved for the first time, the disease is resisted; it hasn't been removed.
  * If saved for a second time the disease effect is removed, but the ability damage done so far, if any, is not.
  * If failed, it applies the payload EffectAbilityDecrease from data in disease.2da and the 24 hour script will fire (the incubation script will never fire again, only the 24 hour one). 
    * The EffectAbilityDecrease follows the parent diseases creator, spell ID and subtype (supernatural or extraordinary).

This means multiple 24 hour scripts and multiple 24 hour payloads can apply if saves are not done over a long period of time. 
Resting - at the end of the rest bar - causes the incubation period to instantly occur, whether it is the initial one or the 24 hour one. Diseases are not removed by resting inherently. Note the scripts run at this point will instantly heal any EffectDamage so delaying it a second can help. 
The nIncuDay and nIncuTime below can be checked against the time and calendar functions: 
  * nIncuDay is the day to have the next event
  * nIncuTime is milliseconds in the nIncuDay to have the next event

// Current day in "days since epoch", so you have 28 days a month, 12 months a year. If you wanted to test it against the incubation time you'd do nIncuDay - nCurrentDay.int nCurrentDay = (GetCalendarYear() * 28 * 12) + (GetCalendarMonth() * 28) + GetCalendarDay();// Current time in the day in milliseconds. If you wanted to test it against the incubation time you'd do nIncuTime - nCurrentMilliseconds .int nCurrentMilliseconds = ((((HoursToSecond(GetTimeHour() + GetTimeMinute()) * 60) + GetTimeSecond()) * 1000) + GetTimeMillisecond();
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nDisease | disease.2da line to use   
1 | "Successful incubation/payload saving throws made" | If you've successfully saved once this is set to 1. If it is at 1 and a further save is successful the disease effect is removed.   
2 | Incubation stage | Tracks what incubation stage we are at, relevant for what scripts are applied if a save is failed more than anything. 0 - No incubation period reached yet - if a save is failed now fire the incubation script 1 - An incubation period has been reached at least once - if a save is failed now fire the 24 hour script Neither suggest that any ability damage or previous scripts have fired merely what stage we can consider the disease to be at.   
3 | nIncuDay | The day the current incubation period will end causing another incubation event. Is an in-game-engine "days".   
4 | nIncuTime | The time in the day the next incubation event will happen. This is the amount of seconds.   
#### Version
1.62 
#### Example
/* Place this in the OnUsed event of an object. It will cause a new disease to attempt to infect the user of the object each time it is used and advances the time by an hour to rush ahead through the Disease's Incubation period. It loops through all diseases defined in the game.*/#include "nw_i0_plot"// Used to report the name of the current and next Disease.string GetDiseaseName(int nCurrentEffect);void main(){ int nCurrentEffect; int nNextEffect; effect eDisease; object oPC; string sDisease; nCurrentEffect = GetLocalInt(OBJECT_SELF,"nCurrentEffect"); eDisease = EffectDisease(nCurrentEffect); oPC = GetLastUsedBy(); RemoveEffects(oPC); sDisease = GetDiseaseName(nCurrentEffect); SendMessageToPC(oPC,"Applying Disease number " + IntToString(nCurrentEffect) + " " + sDisease); ApplyEffectToObject(DURATION_TYPE_TEMPORARY,eDisease,oPC,30.0f); if( nCurrentEffect == 16) { nNextEffect=0; } else { nNextEffect=nCurrentEffect+1; } SetLocalInt(OBJECT_SELF,"nCurrentEffect",nNextEffect); sDisease = GetDiseaseName(nNextEffect); SendMessageToPC(oPC,"Advancing 1 hour to End of Incubation Stage in 10 seconds."); DelayCommand(10.0, SetTime(1,0,0,0)); DelayCommand(3600.0, SendMessageToPC(oPC,"Next Disease number " + IntToString(nNextEffect) + " - " + sDisease)); return;}string GetDiseaseName(int nCurrentEffect){ string sDisease = ""; switch (nCurrentEffect) { case 0: sDisease = "DISEASE_BLINDING_SICKNESS"; break; case 1: sDisease = "DISEASE_CACKLE_FEVER"; break; case 2: sDisease = "DISEASE_DEVIL_CHILLS"; break; case 3: sDisease = "DISEASE_DEMON_FEVER"; break; case 4: sDisease = "DISEASE_FILTH_FEVER"; break; case 5: sDisease = "DISEASE_MINDFIRE"; break; case 6: sDisease = "DISEASE_MUMMY_ROT"; break; case 7: sDisease = "DISEASE_RED_ACHE"; break; case 8: sDisease = "DISEASE_SHAKES"; break; case 9: sDisease = "DISEASE_SLIMY_DOOM"; break; case 10: sDisease = "DISEASE_RED_SLAAD_EGGS"; break; case 11: sDisease = "DISEASE_GHOUL_ROT"; break; case 12: sDisease = "DISEASE_ZOMBIE_CREEP"; break; case 13: sDisease = "DISEASE_DREAD_BLISTERS"; break; case 14: sDisease = "DISEASE_BURROW_MAGGOTS"; break; case 15: sDisease = "DISEASE_SOLDIER_SHAKES"; break; case 16: sDisease = "DISEASE_VERMIN_MADNESS"; break; } return sDisease;}
#### See Also
functions:  |   EffectPoison   

constants:  |   DISEASE_* Constants
