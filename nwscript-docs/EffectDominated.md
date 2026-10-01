<!-- Source: https://nwnlexicon.com/index.php/EffectDominated -->

# EffectDominated()
Returns a new effect object. 
effect EffectDominated();
#### Description
Create a Dominate effect. 
A dominated creature is added to the effect creators party: Thus note, it cannot be created/cast by a non-creature! This means they will become instantly friendly and not attack each other, and they are treated as a normal friend as a henchman would be. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
You cannot dominate yourself. 
#### Remarks
More on Domination: the dominated creature runs a new set of AI scripts to make sure they attack the new enemies - normally their former allies. They will follow commands of the master, too. 
Domination can only affect 1 creature at a time, dominate another, it will remove the domination from the previous. The only exception is with EffectCutsceneDominated() which itself is a little buggy with GetAssociate. 
Domination is a mind effect, and immunity to mind spells or domination will stop this working. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
Note that creature should not be immortal to be dominated. Use SetImmortal to set it to false if you need to do it programmatically. 
#### Effect Breakdown
The effect is a complex effect of CREATURE_STATE_DOMINATED (value 7). It should be applied from a creature to another creature only. Apart from this function the game engine will create an internal domination effect for two cases: 
  * When SKILL_ANIMAL_EMPATHY affects an animal or beast. This is a supernatural effect, temporary with a duration of 60 seconds per skill user hit dice.
  * When On Hit: Dominate fires, it will have the domination effect paired with VFX's referencing VFX_DUR_MIND_AFFECTING_DOMINATED and VFX_DUR_CESSATE_NEGATIVE. This is a magical effect for 6 seconds per round duration.

This effect is rather...weird. You can tell the game was only tested for PvM, and not MvM or PvP when it comes to using this effect properly. 
Bioware took the easy option and made anything against a PC or an associate of a PC turn into Daze in GetScaledEffect in nw_i0_spells.nss but you at least are not forced to have this happen. 
Some quick notes: 
  * NPC applying this to a PC has the effect applied (and PC stop moving) but no scripts are set, and no ASSOCIATE_TYPE_DOMINATED is valid for the creator of the effect and no GetMaster is valid on the PC.
  * NPCs applying this to other NPCs changes no scripts and doesn't seem to apply the statescirpts.2da nw_g0_dominated ever either. However it does set the creature to not be commandable (ie; SetCommandable(FALSE) is used). The other odd thing is since they're not added as "associates" the original creature retains their original hostility to PCs (or at least PCs still see hostile ones as red; eg if a Hostile faction creature is dominated by a Defender faction creature, it still is red). This could be worked around possibly.
  * PCs applying this to NPCs will apply the full "henchman" associate script set in statescripts.2da

Need to test: 
  * PC vs PC, and PC vs. PC associates.
  * NPC vs associates of a PC or NPC, eg: Summon, Henchman, Familiar, etc.
  * What happens for Familiars, Animal Companions, Henchmen, Summons using the effect on others

When does nw_g0_dominated even fire? What cases do the full state scripts get applied? 
Creatures can be immune to domination by having IMMUNITY_TYPE_DOMINATE or IMMUNITY_TYPE_MIND_SPELLS, or an existing master/domination effect (you need to remove the existing domination effect to apply a new one). There is a rare hardcoded exception that spells.2da "Control Undead" line 28 will bypass these immunities, or you can use EffectCutsceneDominated to bypass. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 7, CREATURE_STATE_DOMINATED |   
#### Known Bugs
NPCs who are under domination of another NPC is buggy - there is no statescript run, and no associate properly set, meaning the creature just gets made uncommandable for the duration. 
NPCs who dominate PCs also is buggy - which may be why Bioware replaces it with a Daze effect instead. 
#### Version
1.62 
#### Example
// Sample code for applying domination to a target -// - not OBJECT_SELF, and creator must be a creature.void main(){ // This is the Object to apply the effect to. object oTarget = GetPCSpeaker(); // Create the effect to apply effect eDom = EffectDominated(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_DOMINATE_S); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDom, oTarget);}
#### See Also
functions:  |   EffectCutsceneDominated
