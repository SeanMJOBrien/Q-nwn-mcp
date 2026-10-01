<!-- Source: https://nwnlexicon.com/index.php/EffectInvisibility -->

# EffectInvisibility(int)
Create an Invisibility effect. 
effect EffectInvisibility( int nInvisibilityType);
### Parameters 

nInvisibilityType
    One of the INVISIBILITY_TYPE_* constants defining the type of invisibility to use.
### Description
Returns a new effect object that, when applied to a target, causes them to become invisible in one of three possible levels defined in the INVISIBILITY_TYPE_* constants group. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nInvisibilityType is invalid. 
Normal invisibility is broken once the creature attacks or casts a hostile spell. Improved invisibility is retained - 
Darkness invisibility should only be applied when a creature is in a Darkness area-of-effect, and doesn't run out. 
Improved Invisibility will not run out when attacking, and acts as if always invisible. Note that no usual Bioware spell or ability uses the improved version (probably because it'd break a lot of encounters when monsters don't bother reacting to things they can only hear) instead they apply a separate EffectConcealment effect. 
Invisibility means anyone who cannot see through it (EffectTrueSeeing and EffectSeeInvisible effects see though it) must hear you to attack you or know your location (usually standing reasonably close). 
Those who do attack an invisible person get a full 50% miss chance. If the invisible person attacks somebody, they get an automatic sneak-attack (if they have the feat) and +2 to their roll, because the target doesn't know about them (unless they are being attacked by that somebody). 
This is a valid target for VersusRacialTypeEffect and VersusAlignmentEffect, so if you had it apply just to Good creatures, the enemy must be good for you to be invisible. 
### Remarks
The improved effect does not return EFFECT_TYPE_IMPROVEDINVISIBILITY. Everything returns EFFECT_TYPE_INVISIBILITY. 
The mechanics are internal, however, and work pretty well (even hearing them if you get close enough or have enough listen skill). However, default monster AI isn't good enough to listen, and so invisibility for the most part is as good as Etherealness if the people do not have EffectSeeInvisible() or EffectTrueSeeing() applied to them or their hide. 
Any normal invisibility is lost when attacking. Any effect linked to the invisibility effect using EffectLinkEffects() will be removed as well. This is the same behavior as if RemoveEffect() was used to remove invisibility. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
### Effect Breakdown
The perception code in the game runs every few seconds for PCs and on a longer interlude. If invisible then you cannot usually be _seen_ but can be _heard_ (which is at a lower maximum range - see the file ranges.2da). 
If you are friendly to a creature who is invisible, for the sake of gameplay you can still see them. 
The base properties are invisibility are if you can't see but only hear a target, then you have a 50% miss chance to any attack. If someone who is invisible attacks someone who is unaware they gain sneak attacks. If you are invisible you also seem to be immune to attacks of opportunity, even if the target is aware of you. 
If you have the effect removed - by attacking if thats an option, or by RemoveEffect or EffectDispelMagicAll, then any linked effects will also be removed. So Bioware had the EffectConcealment representing Improved Invisibility as a separate effect. Notably this has two issues: you can have one part of Improved Invisibility removed but not the other, and EffectConcealment is not countered by things like See Invisibility or True Seeing, so is much better than it should perhaps be. However this is probably less game breaking then leaving invisibility on the creature giving them unlimited sneak attacks and so forth. 
Different kinds of invisibility have different in game effects with some common parts. The visual effect seems to apply for stealth and EffectSanctuary/EffectEthereal too as part of the perception code. 
When initially applied anyone targeting you has to stop (essentially ClearAllActions is applied to them); this seems to interrupt even if the creature attacking has True Seeing or similar (albeit only for a second since the AI script may kick in again immediately). 
Hostile actions that break normal invisibility are: 
  * Attacking something with melee or ranged attacks (when the OnPhysicalAttacked script is triggered)
  * SignalEvent with EventSpellCastAt and the Hostile flag as TRUE (so an AOE could trigger this not just casting a general hostile spell. Firing a Fireball at nothing also won't trigger it)
  * Setting a trap successfully

Other "not quite hostile" actions that remove invisibility include: 
  * Dying/Death of the creature it is applied to (although most effects should disappear at this point anyway)
  * Removal of a henchman (ie RemoveHenchman)

Note that stealth is slightly different (here just for reference); the things that will cause stealth to go (and other non-combat modes like it - detect, defensive casting, etc.) are: attacking, spellcasting (and feats that trigger "spells"), using a spellcasting item, taunting, setting a trap, counterspelling, pickpocketing, possessing a familiar and resting. 
INVISIBILITY_TYPE_*  | Icon  | Visual Effect Applied  | Hostile Actions Remove?  | EffectSeeInvisible sees  | EffectUltravision sees  | EffectTrueSeeing sees  | Notes   
---|---|---|---|---|---|---|---  
INVISIBILITY_TYPE_NORMAL | Yes - line 45 effecticons.2da | VFX_DUR_INVISIBILITY if unseen or if self | Yes | Yes | No | Yes | Used by Bioware for all usual invisibility.   
INVISIBILITY_TYPE_IMPROVED | Yes - line 46 effecticons.2da | VFX_DUR_INVISIBILITY if unseen or if self | No | Yes | No | Yes | Unused by Bioware. They never coded the AI to listen so it becomes _very_ powerful especially for sneak attackers.   
INVISIBILITY_TYPE_DARKNESS | No | VFX_DUR_INVISIBILITY if unseen or if self | No | No | Yes | Yes | Used for "Darkness" spell, so things attacking people in the darkness have a penalty to hit (unless they have Ultravision or True Seeing).   
You can have more than one applied, presumably the perception checks each one in turn, but only one needs to be valid. 
You can apply versus Racial Type and versus Alignment, meaning you could do an "Invisibility Versus Evil" or somesuch. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nInvisibilityType | INVISIBILITY_TYPE_* applied.   
1 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
2 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
3 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
### Version
1.62 
### Example
// Sample code for applying invisibility to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eInvisibility = EffectInvisibility(INVISIBILITY_TYPE_NORMAL); // Create the visual portion of the effect. This is instantly // applied and not dependent on whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_AC_BONUS); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eInvisibility, oTarget);}
### See Also
constants:  | INVISIBILITY_TYPE_* Constants
