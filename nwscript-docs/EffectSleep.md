<!-- Source: https://nwnlexicon.com/index.php/EffectSleep -->

# EffectSleep()
Returns a sleep effect. 
effect EffectSleep();
#### Description
Returns a sleep effect which can then be applied to an object. 
Sleep is deadly to creatures or PC's with 4 or less hit dice - a coup de grace can be performed on them to instantly kill them. Otherwise, they are prone and of course all sneak attacks hit and people get a bonus to hit them (and they get no dodge or dexterity bonuses). A sleeping creature cannot move, cast spells or do anything. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Sleep only work if they are not immune - by a variety of ways. Immunity: Mind Spells, Immunity: Sleep and the elven ability to be immune all stop it. 
Sleep also has no real duration visual - however, it does have a heartbeat script - "nw_g0_sleep" (as defined in the statescripts.2da file), and there you can add extra Zzz's. The impact effect is a one-time ZZzz on the target. NPC's heartbeats may well apply ZZzz's if it is the default AI. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
The effect has a single variable with the internal "complex state" of CREATURE_STATE_SLEEP (value 9) applied. 
On Hit: Sleep also applies this effect, but will not have it instantly removed when attacked. 
It's actually quite similar to EffectParalyze; the effect seems to have these key features: 
  * Immunities are granted by IMMUNITY_TYPE_SLEEP or IMMUNITY_TYPE_MIND_SPELLS immunity, but also hardcoded to feat line FEAT_IMMUNITY_TO_SLEEP (Half Elves/Elves).
  * If a target is under the effect of sleep and is level 4 or below (coded as COUP_DE_GRACE_LEVEL_LIMIT in ruleset.2da) and is attacked by a successful attack within a 10M (coded as ruleset.2da value MAX_RANGED_COUP_DE_GRACE) it will apply EffectDeath to the creature
  * Will set the creature to be unable to use: 
    * Legs - No movement can take place (counts as flatfooted applying various penalties)
    * Hands - No spells with somatic components can be cast (also counts as flatfooted applying various penalties)
    * Mouth - No spells with verbal components can be cast
    * Ears - Listen checks fail ala EffectDeaf
      * Bizarrely they can still see - see below.
  * The creature will be set to uncommandable, essentially SetCommandable(FALSE) is done on them. You can unset this, but the 3 effects to the legs, hands and mouth mean not much can take place anyway.
  * It will fire the statescript.2da line for Sleep (line 9) every heartbeat

Need to test if a spell with no verbal or somatic components can be cast if SetCommandable(TRUE) is done. 
The effect applies an animation - usually falling on the creatures front - to show they are sleeping. As noted above no extra VFX are played. 
The lack of ears ala EffectDeaf is fascinating since: 
  * If just wandering around with no stealth or invisibility you're always heard anyway
  * If you have a low hide skill and are in stealth, you can still be seen (GetObjectSeen and perception checks still work as normal) but cannot be heard
  * If you are invisible using a spell and don't attempt to hide your footsteps you become completely unseen and unheard.

Why on earth you can "see" when asleep who knows - Bioware being Bioware. The AI even if it can see you, when asleep, cannot actually react anyway. 
You also can escape sleep more easily than other effects, when _damaged_ the sleep effects are automatically removed. This can be from an attack, EffectDamage or other source (eg; wounding effect). Of course that damage when you are level 4 or below kills you, so it's only useful on levels 5 and above. 
Sleep cannot be applied to plot, immortal or dead creatures. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 9, CREATURE_STATE_SLEEP |   
1 | Set to TRUE in ApplyOnHitSleep | Presumably stops the sleep being removed by the On Hit: Sleep attack's own damage! Would be funny if it applies sleep and instantly removes it. Normal sleep effects does not set it.   
#### Known Bugs
Weirdly the sleep effect doesn't remove vision/perception of other creatures (which is probably more to help the player then anything, since their own party would disappear) but does fail listen perception checks, which is very odd - D&D you are meant to be unable to see while asleep but take a -10 check on listen checks. 
#### Version
1.62 
#### Example
// Sample code for applying sleep to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eSleep = EffectSleep(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SLEEP); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eSleep, oTarget);}// Example 1 - Create a sleep effect and apply it to a PC for a duration of 3 minutes.void main(){ object oPC = GetLastUsedBy(); effect eSleepEffect = EffectSleep(); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eSleepEffect, oPC, 180.0f);}// Example 2 - Use EffectSleep() directly without an effect// variable.void main(){ object oPC = GetLastUsedBy(); ApplyEffectToObject( DURATION_TYPE_TEMPORARY, EffectSleep(), oPC, 180.0f);}
#### See Also
functions:  |   RemoveAmbientSleep
