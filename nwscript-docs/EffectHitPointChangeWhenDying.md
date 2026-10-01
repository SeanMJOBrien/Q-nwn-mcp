<!-- Source: https://nwnlexicon.com/index.php/EffectHitPointChangeWhenDying -->

# EffectHitPointChangeWhenDying(float)
Returns a new Hit Point Change When Dying effect. 
effect EffectHitPointChangeWhenDying( float fHitPointChangePerRound);
#### Parameters 

fHitPointChangePerRound
    Positive or negative amount to change hit point by, but not zero.
#### Description
Create a Hit Point Change When Dying effect. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if fHitPointChangePerRound is 0. 
Fractions can be set; using -0.2 for fHitPointChangePerRound will mean that 1 HP is lost every 5 rounds. 
A dying creature can still be conventionally damaged - this is more useful if you wish to have a very simple OnPlayerDying event, which could apply this to do damage until they are dead (or receive healing), using EffectHitPointChangeWhenDying(-1.0). 
This should only be applied to a PC object which is in the OnPlayerDying state (between 0 and -10 hit points). At -11 hit points a creature is considered fully dead. At 1 hit point a creature is considered alive. 
The way this effect works apply it instantly, not temporarily or permanently, since the first instance of application then adds a new temporary effect of the right duration to do the next tick of healing or damage. 
#### Remarks
Healing a character (or anything that makes HP go above 0) when a character is dying will cause the effect to automatically disappear and they become alive again. 
Also note that a more conventional way to do bleeding would be to apply a cause of EffectDamage(), with a DelayCommand() wrapper around a function to apply a new one every 6 seconds. 
Using this effect to slowly heal a player is buggy - see Effect Breakdown. Use EffectHeal instead in these cases. 
#### Effect Breakdown
The effect is reasonably simple; when created it will calculate the next "tick" of damage or healing. It then creates a new temporary effect with a duration matching the rate of change (eg; 2.0 means it has a duration of 3 seconds applied, 1.0 means 6 seconds). At the end of the duration the effect is removed, and on that removal it applies the right healing or damage, then creates another one of the same duration. The creator of this effect is the PC themselves. 
The healing version simply called SetCurrentHitPoints but note below the bug as it _does_ change from 0 to 1 hit points which this function doesn't allow. 
The damage version (which has no feedback, and is not "True damage" ala EffectDamage) also applies a hardcoded VFX depending on blood type: "W" (or petrified): VFX_COM_BLOOD_SPARK_LARGE, "R": VFX_COM_BLOOD_CRT_RED, "G": VFX_COM_BLOOD_CRT_GREEN and "Y": VFX_COM_BLOOD_CRT_YELLOW. 
You can have more than one running at once but it gets a bit messy of course. Recommended to only have one at once. 
When being healed using this; reaching a non-dying, non-dead state (ie 1 HP or more) on the expiry of the effect causes the effect to simply not do anything on removal (no new effect created). Note: 
  * If this applies "healing" and you are at 1 HP you're still "dead" - unable to move - but we could consider this "stabilized" as it were.
  * Healing with EffectHeal can bring the dead person up to even max HP and it won't allow them to move.
  * Only EffectResurrection will properly raise them from this weird state.

The oddity of this - which might be considered a bug - is that EffectHeal when the player is on 0HP going to 1HP properly raises them up as it should. 
The _vast majority_ uses of this effect are to inflict damage however, where this bug won't occur. 
EffectResurrection will remove the effects with the above note that their expiry will not trigger another effect cleaning them all up. 
Only healing up to 1HP or more will stop the effects - just healing in general won't stop it occurring. You can of course manually remove the effects in these cases if you wish to "stabilise" them (although healing kits won't). 
EffectRegenerate - from items or spells - plays havoc with dying so you might want to remove it in some cases. It still applies (obviously) so usually outstrips any dying damage, sometimes leaving the player in "dying limbo" unable to die fully or heal fully if they heal 1 per 6 seconds and dying causes 1 per 6 seconds. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectFloat  
0 | fHitPointChangePerRound | The amount of hit points changed per "round" or over 6 seconds. Cannot be 0.0.   
#### Known Bugs
Trying to locate and destroy this effect is difficult because the effect type returned by GetEffectType is EFFECT_TYPE_INVALIDEFFECT (along with knockdown and a few others). However since healing automatically removes it there is less issues. 
As noted above using the healing variant (where fHitPointChangePerRound is positive) can leave the player in a quasi-healed state but not resurrected. This could be considered a plus in some cases, but since normal healing at that point won't raise the player it's definitely a bug (EffectHeal properly raises them if they get to 1HP or more). 
#### Version
1.62 
#### Example
// Sample code for applying a loss of 1 HP every 0.5 rounds, so// every other round, to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eHPLoss = EffectHitPointChangeWhenDying(-0.5); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_VFX_IMP_HARM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eHPLoss, oTarget);}
#### See Also
constants:  |   EFFECT_TYPE_* Constants
