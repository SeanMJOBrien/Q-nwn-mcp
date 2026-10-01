<!-- Source: https://nwnlexicon.com/index.php/EffectAppear -->

# EffectAppear()
Create a special effect to make the object "fly in". 
effect EffectAppear( int nAnimation=1);
#### Parameters 

nAnimation
    nAnimation determines which appear and disappear animations to use. Most creatures only have animation 1, although a few have 2 (like beholders)
#### Description
Effect making Object appear to come from above camera view, and land. 
This is applied on a spawned creature with a parameter in CreateObject(), such as spiders appearing from the ceiling or dragons leaping from the sky. 
The target this effect is applied to must be a creature for it to work. This effect can only be applied instantly. 
#### Remarks
When used on a creature which is already present, it will make them instantly jump down - large Dragons are about the only creature this looks good for. Otherwise, use OnSpawn for spiders, beholders, birds and other things so they appear to climb or fly down straight at a PC. 
Oh, and for Humanoids, it is likely they will fly like "Superman", and while suitable for creatures with wings, it is less suitable for the average human. Ok, the example uses it like that though... 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Since this is an instant effect there is little need to use GetEffectInteger with it. It always an invalid effect for the purposes of GetEffectType even if constructed correctly. 
The effect essentially clears the current animation (but probably not the action queue) and forces a similar thing to PlayAnimation (except it overrides things like combat animations). The animation is "appear" (a_ba.mdl) or "cappear" (partial models) for 1 or "cappear2" (only partial models) for 2. These cannot be played with PlayAnimation so it is the only way to use them. 
The duration of the animation appears to be around 2 seconds at most from some informal testing and checking of the animation files (a_ba.mdl has a 2 second length animation ("flying in") and 0.3 second transition time, however beholders have 1.33333 second animation length and 0.25 transition time). During this time this animation will trump other ones, but at the end it should immediately go into anything else (eg; flying in -> knockdown applied -> suddenly ends up in knocked down state). 
EffectDisappear and EffectDisappearAppear has similar uses of animation ID's. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAnimation | Animation 1 or 2.   
#### Version
1.22 
#### Example
// Will just jump down the entering object, perhaps when they // fall down a pit and this trigger can be at the bottom.void main(){ // Get the object to apply the effect to object oPC = GetEnteringObject(); // Declare the effect effect eAppear = EffectAppear(); // Apply the effect instantly to the entering object ApplyEffectToObject(DURATION_TYPE_INSTANT, eAppear, oPC);}
#### See Also
functions:  | EffectDisappearAppear EffectDisappear  

events:  |  OnSpawn Event
