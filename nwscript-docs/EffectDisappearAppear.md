<!-- Source: https://nwnlexicon.com/index.php/EffectDisappearAppear -->

# EffectDisappearAppear(location, int)
Returns a new Disappear/appear effect. 
effect EffectDisappearAppear( location lLocation, int nAnimation = 1);
#### Parameters 

lLocation
    Location where the affected object will reappear. 

nAnimation
    Which appear/disappear animation to use (Default: 1)
#### Description
Create a Disappear/Appear effect that can be applied to a creature or placeable. A creature will "fly away" for the duration of the effect and will reappear at lLocation. A placeable will simply fade out and in again. 
Bioware uses this to have things fly (with wings) or flee, and beholders come up out of the ground in Hordes of the Underdark, or more importantly, move away though the ground holes available. 
Using nAnimation set to 2 will make a few creatures use a second special disappear/appear animation they may have - most notably for beholders, "floating up out of the ground". 
The target this effect is applied to must be a creature or placeable for it to work. This effect should not be applied instantly or permanently, only temporarily. 
#### Remarks
This can be used on placeables (unlike EffectAppear, although EffectDisappear does work on them), this almost acts like a "move" for them and you won't need to Copy them or anything. Static placeables won't move properly since walkmesh is only calculated on an area load by clients, so be wary and test if you try it. The facing is retained and can be later set with SetFacing if required. 
For creatures it is most useful for flying creatures with the right animations to leap large gaps at once. Using anything but 1 in nAnimation will not work without the alternate appear/disappear animations present on the monster. 
Anything can, however, use this effect and although strange, humans can fly off like Superman if you wish! For humanoid NPC's with wings, it looks correct, however. 
Do not use it on PC's, however, because it is likely to not look good at all, or may be confusing if you do not tell them it'll happen or they don't activate it themselves. 
**Warning:** If you use this on a creature who is close to dying, and does die when under this effect, it may make their body inaccessible. It might be recommended to make them at least immortal during the effects duration. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare effects, and apply them using an ApplyEffectToObject() Command. See the Effect Tutorial for more details. 
#### Effect Breakdown
The effect will store where the creature or placeable is travelling to which may be useful. 
While in transition it moves the creature or placeable to Limbo for the duration, which is a kind of "invalid place" DMs can send creatures to. This is why a body, if being damaged constantly (eg; by Acid Arrow) can die but body not appear back on screen. 
It waits 2000 milliseconds (2 seconds) before removing them from the area, to be able to play the animation. If no animation is present they'll stand there for 2 seconds and then disappear. Appearing takes 2 seconds as well. So a minimum duration of 4 seconds (or potentially 5 to account for removing/adding) may be needed to work successfully. 
It is also worth applying this as a supernatural effect so it's not dispelled by accident while in transition. However if removed or dispelled or removed early the creature simply does the final leap down immediately (or in a placeables case appears immediately) meaning you could potentially have a long duration added in and remove it when the leap down is required. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAnimation |   
GetEffectObject  
0 | lLocation Area | Equivalent to GetAreaFromLocation(lLocation)   
GetEffectVector  
0 | lLocation position X | Equivalent to GetPositionFromLocation(lLocation).x   
1 | lLocation position Y | Equivalent to GetPositionFromLocation(lLocation).y   
2 | lLocation position Z | Equivalent to GetPositionFromLocation(lLocation).z   
#### Known Bugs
To make this work, you must set the duration (on ApplyEffectToObject) to 3.0 seconds or greater (obviously the duration type must be temporary). In a busier area the duration might have to be a larger number. 
The animation doesn't appear on just about resurrected creature. 
For creatures with wings, if using scaled version of the winged creature according to Builders_Guide_To_Horses, the animation doesn't appear to work (tested for "Harpy"). 
There are reports that dying while it is in effect (ie they are "up in the air") can cause the corpse to not appear properly for looting purposes breaking modules. It is worth not doing it at low HP, or applying immortality during the duration of the effect, to counter this. 
#### Version
1.64 
#### Example
// Sample code for applying disappear appear effect (for 10// seconds, to go to their own location (up then down), to ourselves.void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eFly = EffectDisappearAppear(GetLocation(oTarget)); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_PULSE_WIND); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eFly, oTarget, 10.0);}
#### See Also
functions:  |   EffectAppear  EffectDisappear
