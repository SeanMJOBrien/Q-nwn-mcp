<!-- Source: https://nwnlexicon.com/index.php/EffectBlindness -->

# EffectBlindness()
Create a Blindness effect. 
effect EffectBlindness();
#### Description
Returns a new effect object that when applied to a player will dim his surroundings and remove all objects from his view. 
Blindness makes it so you can't see anything - 50% miss chance for all attacks, and it doesn't allow spells to be targeted directly at creatures (although area-of-effect spells, like Fireball, still can be targeted at the ground). 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Blindness' effect's will not stack with each other, so you can never make them miss 100% of the time. You can apply it more than once, obviously all instances need to be removed for blindness to be fully cured. 
FEAT_BLIND_FIGHT lets the target re-roll any misses when blinded, and is the only way to actively counter this except for having IMMUNITY_TYPE_BLINDNESS
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Blindness at it's core comes down to applying these effects to the person blinded (if they're not immune): 
  * EffectMissChance(50, MISS_CHANCE_TYPE_NORMAL). The 50 is coded as BLIND_MISS_CHANCE in ruleset.2da so can be altered.
  * EffectVisualEffect(VFX_DUR_BLIND). This VFX is purely there to override "low light vision" or "darkvision" VFX's which usually light up dark areas.
  * EffectVisualEffect(VFX_DUR_BLACKOUT). This VFX blacks out the lighting, making it pitch black.

Then it then changes a whole load of perception checks the creature has - for instance close range people may only be heard, and further ones not seen or heard so essentially disappear. 
There are also some inherent penality to some skills and bonus for people attacking you, as defined in ruleset.2da. These apply if you are blind from many methods not just this effect (such as EffectDarkness). 
Note that perception lists only operate on creatures, therefore placeables, doors, traps, items, area of effects and VFX fired at the ground will appear still as usual. Still quite hard to walk around in the dark though. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | 16 | Always 16, which is the games constant value for CREATURE_VISION_TYPE_BLIND   
#### Version
1.62 
#### Example
// Sample code for applying blindness to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eBlind = EffectBlindness(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_BLIND_DEAF_M); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eBlind, oTarget);}
#### See Also
functions:  |   EffectLinkEffects
