<!-- Source: https://nwnlexicon.com/index.php/EffectVisualEffect#Remarks -->

# EffectVisualEffect(int, int, float, vector, vector)
Creates a new visual effect object. 
effect EffectVisualEffect( int nVisualEffectId, int nMissEffect = FALSE, float fScale=1.0f, vector vTranslate=[0.0,0.0,0.0], vector vRotate=[0.0,0.0,0.0]);
#### Parameters 

nVisualEffectId
    The visual effect to be applied, usually constants prefixed: VFX_COM_* / VFX_DUR_* / VFX_EYES_* / VFX_FNF_* / VFX_IMP_* (a line from visualeffects.2da) 

nMissEffect
    if this is TRUE, a random vector near or past the target will be generated, on which to play the effect (use only for DURATION_TYPE_INSTANT vfx, see remarks) (Default: FALSE) 

fScale
    The scaling factor visual transform to apply to the visual effect. NWNEE only. Default: 1.0f 

vTranslate
    The translation vector visual transform to apply to the visual effect. NWNEE only. Default: [0.0,0.0,0.0] 

vRotate
    The rotation vector visual transform to apply to the visual effect. NWNEE only. Default: [0.0,0.0,0.0]
#### Description
This function creates a new Visual Effect. 
Visual effects are all in the file **visualeffects.2da** and there are normally several which do not have effect constants (under VFX_ in the constants list). 
If nMissEffect is TRUE, a random location is chosen for where the effect will be applied to (most applicable for **beams** or **projectiles** , or instantly applied VFX, see remarks). 
The target and the duration of this effect depend on what kind of VFX_ constant is being used. Testing usually helps. See below. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

As of 1.80.8193.14, this function now takes optional parameters that allow the scripter to apply visual transforms to the visual effect. This patch also allows some previously hardcoded types of visual effect to be altered, for instance new beams can be added to the game, with progfx.2da. 
#### Remarks
The visual effect ID is simply a link to a line in visualeffects.2da - there are a lot of lines that have no equivalent nwscript.nss constant. 
There are several "Categories" of visual effects, all which should have a certain type of application to a target or location: 
  * VFX_BEAM_ - Beams between the source and target. You usually apply this effect with EffectBeam(). It can work in this function but can be very odd.
  * VFX_COM_ - "Common" or "Combat" visual effects. Many need a duration, others can be applied instantly.
  * VFX_DUR_ - "Duration" visual effects, you normally only apply these to objects, as VFX_IMP_, but with a duration.
  * VFX_EYES_ - "Eyes" visual effects, which tend to work only on the default phenotypes.
  * VFX_FNF_ - "Fire and forget" visual effects, which tend to be applied instantly with ApplyEffectAtLocation(), although you can apply them to a target, it usually doesn't look as good
  * VFX_IMP_ - "Impact" visual effects, which tend to be applied instantly but several include durations. These requires the use of a an instantly-applied, ApplyEffectToObject(). Normally can never be applied at an location, as it requires certain "nodes" to fire effects from.

Also note that many visual effects have sounds. Also, this can be a cause of slowdown in FPS, as visual effects are of course, along with the sounds they produce, memory and graphically intensive. 
Visual effects, because they can be applied instantly and for durations, can be put in EffectLinkEffects() as long as they are no the only effects in the link. They can be got as normal if they are applied for a duration with GetFirstEffect()/GetNextEffect(). 
Note that the **nMissEffect** option for visual effects is quite often _pretty awful_ - it should choose a nearby location and fire the VFX there but can be dozens of meters away. It also messes up how it looks for duration based effects - for instance VFX_DUR_BIGBYS_INTERPOSING_HAND should turn in place for a bit - if fired with a miss effect since it is applied instantly it appears for 2 seconds statically then instantly disappears. It should be replaced in all cases with a proper visual transformation options available or, well, if it's not staying around for any length of time just fire it at a new location even if you're not using NWN:EE! 
### Effect Breakdown
EffectBeam is a more complicated VFX type constructor, which has an Effector (source of the beam) and a source node (such as hand, or body, or eyestalk). EffectVisualEffect defaults the effector to the applying creature, and the source node to be the hand node it seems. 
For the usual VFX there are some rules the game seems to follow: 
ApplyEffectAtLocation: 
  * This will only fire the effect as an DURATION_TYPE_INSTANT fire and forget effect _regardless_ of the duration put in. No effect is saved on the area or anywhere, and so if you want a more permanent VFX apply a duration to a placeable (noting the Known Bugs with this) or a vfx_persistent.2da based object called via. EffectAreaOfEffect.
  * The "duration" if instantly applied is around 2 seconds or so if you by accident use a duration based VFX.
  * As per below moving into range of the location the VFX is playing will not mean a player can see it, so keep these instant ones short.

ApplyEffectToObject: 
  * DURATION_TYPE_INSTANT - The VFX fires off instantly and doesn't appear in the effects list. Essentially all clients in visible range are told about the VFX to play and they then play it. If you move into range to a "reasonably long playing" instant VFX that client will miss out so don't make them too long.
  * DURATION_TYPE_TEMPORARY or DURATION_TYPE_PERMANENT: 
    * The duration is **overriden** to be Instant if it detects it is actually instant, seemingly using the Type_FD column (if it is F - fire and forget - or P - projectile).
    * A miss effect is also considered instant (but is awful, don't use it! see below)
    * If the Type_FD column is B - beam - or D - duration - in visualeffects.2da, the effect gets correctly applied for the duration requested. As the object moves in and out of PC range those PCs are told it exists and to play the corresponding VFX. This means it might "appear" with relevant sound effect quite often (eg; opening and closing a door, stealth mode in combat) so don't make the impact sound effect too long.
    * Multiple VFX of the same line ID are not applied again and again. Only one will apply. This means it is safe to use, for instance, VFX_DUR_BIGBYS_INTERPOSING_HAND several times at once. The client will only play one. Note the bugs when applying these to placeables in the Known Bugs section, since they can for some reason appear multiple times even if only applied once. 
      * Note for if you use the same line ID and a different transformation, but want the transformation to appear - delay the VFX application by at least 0.01 seconds after removal, else it will not change visibly for the creature affected.

nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nVisualEffectId | visualeffects.2da line reference   
2 | nMissEffect | Default 0   
GetEffectFloat  
0 | fScale | Scaling of the beam, default 1.0   
GetEffectVector  
0 | vTranslate | Default 0.0, 0.0, 0.0   
1 | vRotate | Default 0.0, 0.0, 0.0   
### Known Bugs
When a visual effect is applied to a placeable, it may become impossible to remove. This is a known issue with VFX_DUR_CUTSCENE_INVISIBILITY (which removes it from sight) and some others, but has not been tested for all visual effects. It occurs when the last player leaves the area or enters cutscene mode. It can be prevented by removing the effect in those situations, reapplying it when a player enters again. Alternatively NWN:EE includes SetObjectVisualTransform which could move the placeable far below the visible map to "hide" it for a while. 
A player moving in an out of range of a placeable with VFX seems to duplicate it repeatedly - reported here. 
Also applying visual effects to placeables may have them apply inconsistently if the area is re-entered with similar objects - see here. 
Concealment-style VFX may also be lost if stealth mode is entered/exited as shown here. 
EffectLinkEffects containing just visual effects seems to basically not work. You must combine it with any other effect for the visual to be saved and play correctly. 
### Version
This function was updated in 1.80.8193.14 of NWN:EE. It added the visual transform options. 
### Example
// Sample code for applying a VFX_IMP_ visual, a AC-bonus// (Mage armor) visual, to a target.void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the visual portion of the effect. effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); // Apply the visual effect to the target. // - We apply VFX_IMP_ constants instantly, to a target. ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget);}// Sample code for applying a VFX_DUR_ visual, a// stoneskin visual, to a target.void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the visual portion of the effect effect eDur = EffectVisualEffect(VFX_DUR_PROT_STONESKIN); // Apply the visual effect to the target. // - We apply VFX_DUR_ constants for a duration, here // it is permanent (could be temporary), to a target. ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDur, oTarget);}// Sample code for applying a VFX_FNF_ visual, a fireball,// to a location.void main(){ // This is the Target to apply the effect at. location lTarget = GetLocation(OBJECT_SELF); // Create the visual portion of the effect effect eAOE = EffectVisualEffect(VFX_FNF_FIREBALL); // Apply the visual effect to the target. // - We apply VFX_FNF_ constants instantly, and only // at a location. ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eAOE, lTarget);}
### See Also
functions:  |  ItemPropertyVisualEffect EffectBeam  

constants:  |  VFX_COM_* / VFX_DUR_* / VFX_EYES_* / VFX_FNF_* / VFX_IMP_*
