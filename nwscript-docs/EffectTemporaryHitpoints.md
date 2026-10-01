<!-- Source: https://nwnlexicon.com/index.php/EffectTemporaryHitpoints -->

# EffectTemporaryHitpoints(int)
Create a Temporary Hitpoints effect that raises the Hitpoints of the target. 
effect EffectTemporaryHitpoints( int nHitPoints);
#### Parameters 

nHitPoints
    A positive integer
#### Description
Returns a new effect object that when applied to a target will temporarily increase their total Hit Points allowable. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nHitPoints < 0. 
The limit of nHitPoints is unknown however the limit for Hit Points in general is 32,767. Going over this wraps around to -32,767 so be careful using ridiculous numbers (eg; to make a boss temporarily invincible unless the effect is dispelled). 
This effect should not be applied instantly, only temporarily or permanently. 
This effect can be applied only on a creatures. 
#### Remarks
Temporary hit points are un-healable "extra" hit points that will be removed first, before actual damage is done to the target. If the target is already damaged, then the temporary hit points seem to partially heal them - of course, they will get removed as the effect normally would. 
They definitely do stack, and was one of the first spell-fixes to spells like Vampiric touch. Should the effect be dispelled/removed, and it take you under your current hit points, then you should die (example: having Constitution removed will remove real hit points, which should put you into negative, but temporary HP is keeping you alive - if lost - will kill you). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
Since RemoveEffect does not remove the effect instantly (in the current script call) the current hit points of a target remains the same. If you need to have something happen when such effects are removed (such as reapplying them) delay a call to a custom function or another script after the effect has been removed. 
#### Effect Breakdown
There's not a great deal to add to the above assessment. Like changes to constitution, which can add or remove hit points, this adds temporary HP which cannot be instantly checked if removed. 
It's used internally (although visibly) in EffectPolymorph, and should be applied as a new effect from EffectNegativeLevel and the associated On Hit property. 
Changes to hit points will appear on the character sheet such as 150/50 HP if you had 100 temporary HP. 
Since temporary HP, when lost, could remove all effects attached to it, spells which apply it usually apply no links to it. This makes dispelling the effects of that particular spell twice as hard (there are two different effect chains to dispel to remove it entirely). You can use EffectRunScript to capture when one of the effect chains is lost (the non-temp HP one) to remove the temporary HP effects. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | Current Temporary Hit Points | Set to the nHitPoints value initially, any hits will decrease this value until it is 0 whereupon the effect is removed.   
#### Example
// Sample code for applying 5 temporary hit points to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eHP = EffectTemporaryHitpoints(5); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HOLY_AID); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eHP, oTarget);}
#### See Also
constants:  |   EFFECT_TYPE_* Constants
