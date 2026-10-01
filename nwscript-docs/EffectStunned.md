<!-- Source: https://nwnlexicon.com/index.php/EffectStunned -->

# EffectStunned()
Returns a Stunned effect. 
effect EffectStunned();
#### Description
Create a Stun effect. 
This is a mind-effecting effect, and so immunity to mind effects prevents this from working. 
Stunning makes a creature flat footed (no dexterity bonuses for AC), holds them in place and so forth. See Effect Breakdown for the full list of information. 
The target this effect is applied to must be a creature for it to work. It should be applied temporarily or permanently, not instantly. 
#### Remarks
Stunning keeps a creature in one place. They cannot move - even functions like JumpToLocation() will fail, as if they were petrified or paralyzed. 
Stunning can be countered with Immunity: Stun, and Immunity: Mind Spells. 
To truly stop a creature regardless of immunities (eg; in a cutscene), use EffectCutsceneImmobilize and EffectCutsceneParalyze, not this effect. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This is a complex effect that applies the creature state "CREATURE_STATE_HELD" (6). 
Given some ruleset.2da information and testing, being Stunned imparts these changes: 
  * Flatfooted status is applied: Creature loses all dexterity dodge bonuses to their AC (and, if they have less than 10 dexterity, any penalties, oddly).
  * Creatures attacking a stunned creature get +2 to hit (STUNNED_TARGET_BONUS in ruleset.2da)
  * Creature is set to uncommandable
  * Creature has legs AI state removed; ~AISTATE_CREATURE_USE_LEGS (given they are uncommandable this won't do much but does stop "stepping around" in combat or any other odd movement presumably) 
    * Since it is only legs if you make the creature commandable with SetCommandable, any non-movement can still be done (eg; casting a spell)
  * You get an automatic VFX: VFX_DUR_MIND_AFFECTING_DISABLED for the duration.
  * You get a nice swaying drunk animation playing
  * The statescripts.2da line 6 for "Stunned" is fired every heartbeat (default x2_sig_state)

While this is considered a mind affecting effect, FEAT_STUNNING_FIST has a special parameter to bypass mind immunity, similar to how FEAT_DEATH_ATTACK can bypass it for EffectParalyze. Sadly this means scripts cannot bypass the immunity. Both types though are affected by IMMUNITY_TYPE_STUN. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 6, CREATURE_STATE_HELD |   
1 | Is Stunning Fist thus Bypass Mind Immunities | Set to 1 if from FEAT_STUNNING_FIST. It appears just having the effect be supernatural will not bypass IMMUNITY_TYPE_MIND_SPELLS, but this being set also will do.   
#### Version
1.62 
#### Example
// Sample code for applying a stunning effect to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eStun = EffectStunned(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_STUN); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eStun, oTarget);}
#### See Also
functions:  |   ApplyEffectToObject
