<!-- Source: https://nwnlexicon.com/index.php/EffectDeath -->

# EffectDeath(int, int)
Create a Death effect 
effect EffectDeath( int nSpectacularDeath = FALSE, int nDisplayFeedback = TRUE);
#### Parameters 

nSpectacularDeath
    If this is TRUE, the creature to which this effect is applied will die in an extraordinary fashion (Default: FALSE) 

nDisplayFeedback
    Shows feedback to the creature that they're being killed (Default: TRUE)
#### Description
Returns a new effect object that when applied to a target, their hit points are set to -11, they play a death animation (if nSpectacularDeath is TRUE it will apply the 'chunky' death on NPCs, if they are set to in their creature properties and no corpse via. SetIsDestroyable). 
EffectDeath() can easily be countered by Immunity: Death Spells, which is what the immunity protects against. It is only considered easy from what is in the NwN pallet, and the fact that (even in D&D) many undead and constructs will be unaffected too. 
If you apply SupernaturalEffect to EffectDeath it will bypass immunity to death magic. Note that also using EffectDeath outside of a spell script allows you to bypass such immunities. 
The target this effect is applied to must be an object with valid hit points for it to work. This effect can only be applied instantly. 
#### Remarks
Death: The creature becomes uncommandable - they can no longer move, attack, cast or whatever. When it is applied to doors or placeable objects, they are destroyed and play a shatter animation. The death effect is an instantaneous effect that sets the recipient to be 'dead' and then deletes itself, as all instant effects (it is one of the few non-reversible effects along with damage, heal, resurrection and a few others). You apply it, it sets the object dead, and it then disappears forever. To bring a creature back to life you need to use EffectResurrection() (only usable on a creature if they have a corpse, usually by using SetIsDestroyable). 
Death will not hold a normal visual, so it is completely safe to use if you just want them to die - good for the OnPlayerDying module event. If you need to hide it use the nDisplayFeedback option set to FALSE. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare effects, and apply them using an ApplyEffectToObject() Command. See the Effect Tutorial for more details. 
Quick bonus note: Death can be lying forwards or backwards on most models. If you want to intentionally have a corpse lie on their front have EffectDeath() applied from OBJECT_SELF to OBJECT_SELF. If you wish to have them lie on their back use some unusual object, such as the current area of OBJECT_SELF, assigned to apply the effect. Thread on Neverwinter Vault. 
#### Effect Breakdown
Since this is a instant effect looking at these properties isn't the most useful thing, but you can if you need to. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nSpectacularDeath |   
1 | nDisplayFeedback |   
#### Version
1.62 
#### Example
// Sample code for applying death to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDeath = EffectDeath(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_DEATH); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_INSTANT, eDeath, oTarget);}
#### See Also  
---
