<!-- Source: https://nwnlexicon.com/index.php/EffectBeam -->

# EffectBeam(int, object, int, int, float, vector, vector)
Create a Beam effect. 
effect EffectBeam( int nBeamVisualEffect, object oEffector, int nBodyPart, int bMissEffect = FALSE, float fScale=1.0f, vector vTranslate=[0.0,0.0,0.0], vector vRotate=[0.0,0.0,0.0]);
#### Parameters 

nBeamVisualEffect
    VFX_BEAM_* Constant defining the visual type of beam to use. Needs to be a visualeffects.2da line with the "B" type, usually linked to a progfx.2da Beam line. 

oEffector
    The beam is emitted from this object to the object this effect is applied to 

nBodyPart
    BODY_NODE_* Constant defining where on the oEffector the beam originates from. Only some creatures like beholders have anything other than Chest or Hand. See Model Special Nodes for what placeables and doors relate to with this parameter. Note that if it is set to an invalid value it will default to the ground (placeable/door) or root (creature) node. 

bMissEffect
    If this is TRUE, the beam will fire to a random vector near or past the target (Default: FALSE) 

fScale
    The scaling factor visual transform to apply to the visual effect. NWNEE only. (Default: 1.0f) 

vTranslate
    The translation vector visual transform to apply to the visual effect. NWNEE only. (Default: [0.0,0.0,0.0]) 

vRotate
    The rotation vector visual transform to apply to the visual effect. NWNEE only. (Default: [0.0,0.0,0.0])
#### Description
Returns a new effect object defining the beam's properties to use when the effect is applied. This should only be applied to another object. Firing it at a location will not work. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nBeamVisualEffect is not valid. 
The target you can apply this to can be any valid (non static) object that ApplyEffectToObject works on ie a Creature, Placeable or Door, but not a location (to apply it to an arbitrary location create a invisible placeable first). This effect should not be applied instantly, only temporarily or permanently. 
The objects do not have to be creatures, and placeables and doors also work with beams. If a placeable is the oEffector it is recommended to use the default chest body node option for nBodyPart, but you can use others; see Model Special Nodes for what placeables and doors relate to with this parameter. 
bMissEffect works generally "okay" for beams unlike EffectVisualEffect since it seems to take into account the direction/position of the relevant people involved (the originator and the target it's being applied to), and since you can't really apply this to a location it's as good as you might get to show beams missing in spells. Close range beams missing go a bit weird however. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

As of 1.80.8193.14, this function now takes optional parameters that allow the scripter to apply visual transforms to the visual effect. 
Additionally progfx.2da allows programming additional beams not included in the base game. 
#### Remarks
Currently only two main Body Nodes, the Hand and the Chest on most creatures. For specific creatures like Beholder's there are additional monster nodes to represent eye stalks. These wouldn't usually be available on a normal creature. 
Note that beams with sound, which are not dictated by _SILENT at the end, usually should not be used many at a time/for long durations, because of the constant sound effect being played. For visuals only, use the _SILENT version of a beam. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Like EffectVisualEffect you can figure out what VFX is being fired off using the set integers. 
There's not much more to it - it's simply a slightly more complex constructor for EffectVisualEffect with a source node/object that is different to the effect creator and a source body node. 
The object with the effect is the _target_ , the originator is available through GetEffectObject, although no doubt if one dies the beam likely gets removed from both. 
With the now unhardcoded progfx.2da you can do some very cool visual stuff so check that out. 
You can also experiment having not-fully-true-beams as beams in this effect, just make sure the visualeffects.2da line has "B" set under "Type_FD". 
A quick note the game apparently was coded to not remove beams on death, but coded wrongly so beams were removed anyway. The purpose of keeping beams active may have been to make them visually more impressive if they got the killing blow, although most beams used by Bioware have a low duration anyway. Use the new UnyieldingEffect to keep the beams after death. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nBeamVisualEffect | visualeffects.2da line reference   
1 | nBodyPart | No default is set for this, but it seems to default to the root node for placeables/doors as a safety measure.   
2 | bMissEffect | Default 0   
GetEffectFloat  
0 | fScale | Scaling of the beam, default 1.0   
GetEffectVector  
0 | vTranslate | Default 0.0, 0.0, 0.0   
1 | vRotate | Default 0.0, 0.0, 0.0   
GetEffectObject  
0 | oEffector | Object the beam is originating from   
#### Version
This function was updated in 1.80.8193.14 of NWN:EE. It added the visual transform options. 
#### Example
// Apply a beam between 2 placeables, tagged as "BEAM1" // and "BEAM2". They could, of course, be any kind of // visible object, like a Creature or Door.void main(){ // Get the 2 objects object oSource = GetObjectByTag("BEAM1"); object oTarget = GetObjectByTag("BEAM2"); // Declare the fire beam effect effect eBeam = EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST); // Apply it permanently ApplyEffectToObject(DURATION_TYPE_PERMANENT, eBeam, oTarget);}
#### See Also
functions:  |   EffectLinkEffects  EffectVisualEffect  

constants:  |   VFX_BEAM_* Constants
