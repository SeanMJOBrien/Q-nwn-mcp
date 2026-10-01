<!-- Source: https://nwnlexicon.com/index.php/EffectDisappear -->

# EffectDisappear()
Returns a new disappear effect. 
effect EffectDisappear();
#### Description
Create a Disappear effect to make the object "fly away" and then destroy itself. 
It is likely, if the object this is applied to is Plot, has SetIsDestroyable(FALSE) previously set, or is Immortal, this will fail or go wrong. 
This doesn't fire the creatures OnDeath event, it is almost as if it had called DestroyObject() on itself after the animation. 
Do NOT use on a PC! Like DestroyObject() it will either fail to work, or in this case, as it is an effect, may crash the game! 
The target this effect is applied to must be a creature or placeable for it to work. This effect can only be applied instantly. 
#### Remarks
To fly from point to point and keep the creatures hit points, spells and so forth, use EffectDisappearAppear(). 
There appears to be no difference on placeables to using DestroyObject, it's essentially identical. 
This is not to be used on PC creature objects! 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare effects, and apply them using an ApplyEffectToObject() Command. See the Effect Tutorial for more details. 
#### Version
1.62 
#### Example
// Sample code for applying a disappear effect to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eGo = EffectDisappear(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_PULSE_WIND); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_INSTANT, eGo, oTarget);}
#### See Also
functions:  |  EffectAppear EffectDisappearAppear
