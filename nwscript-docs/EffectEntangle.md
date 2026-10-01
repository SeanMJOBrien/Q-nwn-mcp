<!-- Source: https://nwnlexicon.com/index.php?title=EffectEntangle&amp;action=history -->

# EffectEntangle()
Create an Entangle effect 
effect EffectEntangle();
#### Description
When applied, this effect will restrict the creature's movement (causing them to drop to 3 dexterity) and apply a (-2) to all attacks and a -4 to dexterity. 
Web is a form of Entangle, and uses the same effect (but, of course, you can't burn your way out...or laugh at someone doing it to the web anyway). 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Entangle is really useful for spells, such as...entangle! For traps and so on, it may be the same. It can only be stopped with direct immunity to Entangle. 
The effects will not stack, but 2 or more entangles can be applied at the same time. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
While this is a complex effect, it has no parameters available to GetEffectInteger or similar. 
The internal effect are: 
  * Stops the creatures actions when first applied (if they were moving they'd stop, ie; ClearAllActions on them, so a spell being cast is also "cancelled" as if the top left action queue was cleared)
  * Removal of the ability to use the legs on the target creature (AISTATE_CREATURE_USE_LEGS). This seems to set Dexterity to 3 as if paralyzed/flat footed/immobile, causes them to not be able to move, but still allows them to fight (cast spells, use ranged and melee weapons or items).
  * A hidden EffectAbilityDecrease(ABILITY_DEXTERITY, 4); - this doesn't really do anything additional, due to the above lack of legs, but in PnP D&D it would apply if they could move at half speed after breaking partially free of the entangle.
  * A hidden EffectAttackDecrease(2, ATTACK_BONUS_MISC); - this does apply as normal.
  * While applied and the creature casts a spell that has UsesConcentration set to 1, a concentration skill check against a DC of 15 is done before the spell can be cast. If failed the feedback will be "Your concentration has been disrupted by Entangle", the roll is also displayed in EE. Obviously having 14 or more concentration skill is enough to bypass this.

Immunity is granted by IMMUNITY_TYPE_ENTANGLE which itself is not applied from any feats, although a few feats may be checked by spells scripts (eg: FEAT_WOODLAND_STRIDE). 
If you apply more than one EffectEntangle they don't do anything as such, but all of them have to be removed to clear the effects. 
Removing EffectEntangle while another is still in effect removes the effect icon, the red over the dexterity penalty, so it makes it appear as if you are not entangled on the character sheet/examine screen but all other effects still apply. 
An alternative to Entangle which is similar is EffectCutsceneImmobilize. It removes the concentration check, and the other penalties can be done manually. 
#### Known Bugs
The ClearAllActions part of this effect is clunky and causes it to be immensely powerful against the AI who are usually in the middle of attacking/spellcasting and even if stationary still will wait nearly a full round to get back to attacking again. It also affects PCs in the same way. 
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. EffectEntangle only applies a concentration check if UseConcentration in spells.2da is 1. Additional feedback for the concentration check roll has also been added. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed issue where EffectEntangle and other effects stopping movement sometimes left dexterity on 3. 
#### Example
// Sample code for applying entangle to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eEntangle = EffectEntangle(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SLOW); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eEntangle, oTarget);}
#### See Also  
---
