<!-- Source: https://nwnlexicon.com/index.php/EffectDazed -->

# EffectDazed()
Returns a new Dazed effect object. 
effect EffectDazed();
#### Description
Create a Daze effect. 
Dazed creatures have no inherent penalties but unable to attack, use feats or cast spells. They are able to use items and are able to walk away from attackers. 
It is a mind effect, and thus is countered by mind spell immunities. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Daze is your lower level stun, for the most part. It affects the mind as stun is meant to (or not, as the case may be), and allows the target to still move around at walking speed (thus control their actions and where they go). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
The effect has a single variable with the internal "complex state" of CREATURE_STATE_DAZED (value 5) applied. 
Daze was patched by Bioware and the effect is rather...interesting. It has these distinct effects: 
  * The default standing animation will be "swaying" like EffectStunned
  * You will be forced to walking speed
  * Will set the creature to be controllable (AISTATE_CREATURE_CONTROLLABLE)
  * Will have custom feedback for certain actions when they are selected: 
    * ActionAttack, ActionCastSpellAtObject/ActionCastSpellAtLocation and ActionUseFeat (and equivalent PC actions) all will display "This action is not allowed in your current state"

Note that the entire action is stopped; you cannot bypass it and even cheat-instant casting spells using ActionCastSpellAtObject will fail. 
The latter part - disabling the three action types - means you can still do these actions: 
  * Use items (eg; ActionUseItemOnObject or ActionUseItemAtLocation) - this is against D&D rules
  * Walk around (eg; ActionMoveToObject)
  * Set traps on objects (but not seemingly the ground? it just hangs)
  * Pick up and put down items
  * Use objects, open doors
  * Counterspell an enemy spellcaster (yes, you do it successfully)

Note this is still a pretty harsh effect especially since a lot of these actions mean the character is deemed flat footed. 
While the Dazed effect has a statescript.2da line, it is not fired by the game (likely a bug see Known Bugs). 
You can be immune to Daze effects with IMMUNITY_TYPE_MIND_SPELLS (which includes FEAT_PERFECT_SELF) or IMMUNITY_TYPE_DAZED. Plot, immortal or dead creatures are also immune. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 5, CREATURE_STATE_DAZED |   
#### Known Bugs
The statescript.2da line for Dazed is not fired when under the effect of Daze. Likely as part of the changes in 1.30. This leads to henchman AI not removing the effect in some cases (eg; out of combat). 
As of 1.29 and before, Daze meant you couldn't move (same as Stun) but at 1.30, they fixed it so that is was to D&D rules, and you can walk around. 
#### Version
1.62 
#### Example
// Sample code for applying Daze to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDaze = EffectDazed(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_DAZED_S); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDaze, oTarget);}
#### See Also  
---
