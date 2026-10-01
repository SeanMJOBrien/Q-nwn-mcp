<!-- Source: https://nwnlexicon.com/index.php/EffectLinkEffects -->

# EffectLinkEffects(effect, effect)
Creates one new effect object from two separate effect objects. 
effect EffectLinkEffects( effect eChildEffect, effect eParentEffect);
#### Parameters 

eChildEffect
    One of the two effects to link together. 

eParentEffect
    One of the two effects to link together.
#### Description
Returns an Effect that combines the two supplied effects, returning eChildEffect as a child of eParentEffect. The returned effect can then be applied to a target and be affected by all linked effects. 
You can retrieve the Id of the link with GetEffectLinkId. This is the same for every application of that effect, so is not unique across the module but usually is per-object (unless you apply the same effect twice). 
If you remove one of the effects from a target which is linked to others (for example, a Stun effect linked to a nice stunned visual) the other linked effects will be removed too. This lets things like Remove Curse, Freedom, Clarity and so on, look correct - they remove effects by the EFFECT_TYPE_ constant, and let the game work out if there were any extra visuals linked with it. 
Always link effects you want to be removed or dispelled at the same time. 
In addition this is useful to link effects that share some property - eg; EffectDamageResistance used in Endure Elements clears all of the resistances because they are linked if any one gets used to the limit of what the damage resistance allows. This also means things like temporary HP is usually not linked since once lost it'd clear all the other effects of a spell (such as the Aid spell additional bonus to attack). 
Altering an effect using TagEffect, SupernaturalEffect or ExtraordinaryEffect before they are linked, these are wiped when the effects are linked. See the example for details. 
It is not recommended to link together instant effects at all since instant effects may bug out if linked with a duration effect. These can just be applied separately using ApplyEffectToObject. 
**Note:** If an effect removes itself (such as temporary HP which runs out, or an absorb effect that runs out) the entire set of effects linked to it are also removed. Spells like Aid tend to apply 2 different duration effect links, one for the temporary HP and one for the attack bonuses, so the attack bonuses are not lost when the temporary HP is removed. This has a minor effect on EffectDispelMagicBest and EffectDispelMagicAll since it could only remove half the effects of the given spell. 
#### Remarks
You can also link effects to other effects even if they were created with EffectLinkEffects. 
Note: When applying linked effects if the target is immune to all valid effects most other effects will not be applied as well. This means that if you apply a visual effect and a stun effect (EffectStunned()) (in a link) and the target is immune to the stun effect that the visual effect will not be applied as well. Visual Effects are not considered "valid" effects for the purposes of determining if an effect will be removed or not and as such should never be packaged *only* with other visual effects in a link. 
So if you wanted to apply both, say, a Deafness effect and a Stunning effect, but apply them so only Immunity: Deafness and Immunity: Stunning stopped each separately, do not link both effects in one Link. 
However, there is a little discrepancy as such an EffectAttackDecrease() linked with EffectStunned will not be blocked by the immunity, and in this case any visual effects linked together will also not be removed. There might as well be more effects like attack decrease though. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This effect is not technically an effect retrieved with GetFirstEffect/GetNextEffect, but it is marks effects as linked as seen by GetEffectLinkId. This identifier is generated at creation of the effect in the script, so you can get duplicate IDs if you apply the same effect more than once (eg to different creatures). 
#### Known bugs
If a linked effect with only visual effects is created, it will not be able to be applied to a target, and will not display any visual animation. Linking a non-visual effect can remedy the situation, displaying all linked visual animations. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed effect links not being retained after relogging on a server. 
#### Example
// Link Stunning and an appropriate Stunned VFX, and apply to// the user of the lever, for 120 seconds (2 minutes).// If the user is immune to being stunned, they will not see the// VFX either and just get "So and so is immune to Stun"// reported.// However, there IS a separate impact (instantly applied) VFX,// which shows the target was hit by stun, even if they were// immune.// If we then later cast Clarity (which removes mind effects, like// stun) it will remove the associated (linked) visual too.void main(){ // Get the user object oUser = GetLastUsedBy(); // Declare Effects effect eVis = EffectVisualEffect(VFX_IMP_STUN); effect eStun = EffectStunned(); effect eDur = EffectVisualEffect(VFX_DUR_MIND_AFFECTING_DISABLED); // Link effects effect eLink = EffectLinkEffects(eDur, eStun); // Duration is 120 seconds float fDuration = 120.0; // Apply effects - the link can just be applied, no checking // if they are immune or not. ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oUser); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oUser, fDuration);}// Apply two negative effects and one positive. Even though one// of the negative effects is an EffectCurse, it still can be// removed via restoration spells (via looping the effects on// the target) because it is linked to another negative// non-curse effect (which the looping removes).void main(){ // reduce STR by two; it's a Curse! effect eNegative1 = EffectCurse(2,0,0,0,0,0); // reduce CON by two; no curse effect eNegative2 = EffectAbilityDecrease(ABILITY_CONSTITUTION, 2); // increase DEX by two effect ePositive1 = EffectAbilityIncrease(ABILITY_DEXTERITY, 2); // link the effects together effect eLink = EffectLinkEffects(eNegative2, eNegative1); eLink = ExtraordinaryEffect(EffectLinkEffects(ePositive1, eLink)); // apply them ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, GetFirstPC());}// The order using this function along with others is important.void main(){ // Some positive effects to apply effect eDur = EffectVisualEffect(VFX_DUR_CESSATE_POSITIVE); effect eAttack = EffectAttackIncrease(1); effect eSave = EffectSavingThrowIncrease(SAVING_THROW_ALL, 1, SAVING_THROW_TYPE_FEAR); // WRONG: Apply some changes to eSave eSave = TagEffect(eSave, "SAVE_EFFECT_TAG"); // Link effects - this removes / clears the tag set above! effect eLink = EffectLinkEffects(eAttack, eSave); eLink = EffectLinkEffects(eLink, eDur); // RIGHT: Put the TagEffect here: eLink = TagEffect(eLink, "LINK_EFFECT_TAG"); // eLink will properly return LINK_EFFECT_TAG on each of the effects applied now ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, OBJECT_SELF, 20.0);}
#### See Also
functions:  |  ApplyEffectToObject  

constants:  |   EFFECT_TYPE_* Constants
