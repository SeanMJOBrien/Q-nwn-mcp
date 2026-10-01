<!-- Source: https://nwnlexicon.com/index.php/EffectCutsceneImmobilize -->

# EffectCutsceneImmobilize()
Returns an effect that Immobilize a creature similar to Entangle. 
effect EffectCutsceneImmobilize();
#### Description
Returns an effect that when applied will paralyze the target's legs, rendering them unable to walk and sets their dexterity to 3. This effect cannot be resisted. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This actually seems more like a paralysis effect which cannot be resisted. In any case, this most certainly will *always* stop a creature in its tracks. 
Note that for actual real cutscenes check out SetCutsceneMode and similar functions for a much more pleasant cutscene setup. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
This appears to simply change the state of the legs, a new state is set internally with "~AISTATE_CREATURE_USE_LEGS". This stops the target from taking movement actions (eg; ActionMoveToLocation) or WASD movement. One small other thing it seems to do is stop the "auto head look" as if they were paralyzed/held in place. Note that if you are friendly to a creature which is immobilized you can still "bump" them around. 
You can also still use JumpToObject and similar commands to move the object around. 
This is what appears in EffectEntangle but does not come coupled with the decreased attack or concentration check. It still inherently sets the creatures dexterity to 3. This means a creature can still attack/cast spells but simply can't move from the spot they are on. EffectParalyze, EffectStunned and others also remove leg movement, but since they also remove the ability to issue any commands it's rather moot they do. 
While it is meant for cutscenes you could equally (carefully) use this in spell scripts. 
There are no available properties of the effect using GetEffectInteger or similar. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed issue where EffectEntangle and other effects stopping movement sometimes left dexterity on 3. (Other effects stopping movement include EffectCutsceneImmobilize) 
#### Example
// Sample code for applying Cutseen Immobilize to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eImmobilize = EffectCutsceneImmobilize(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eImmobilize, oTarget);}
#### See Also
functions:  |   EffectCutsceneGhost
