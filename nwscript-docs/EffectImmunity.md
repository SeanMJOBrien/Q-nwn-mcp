<!-- Source: https://nwnlexicon.com/index.php/EffectImmunity -->

# EffectImmunity(int)
Create an Immunity effect. 
effect EffectImmunity( int nImmunityType);
#### Parameters 

nImmunityType
    One of the  IMMUNITY_TYPE_*  constants. Note that IMMUNITY_TYPE_NONE (0) is actually IMMUNITY_TYPE_ALL.
#### Description
Returns a new effect object that when applied to a target will cause them to be Immune to one of the 33 possible types of Hostile actions found in the IMMUNITY_TYPE_* constants group. 
Immunities don't stack, but of course a creature can have 2, they just don't do anything extra. They are never total damage immunities, but rather immunities that stop most EffectXXX constructors! Some, such as IMMUNITY_TYPE_MIND_SPELLS will actually stop many effects (in this case, Domination, Stun, Confusion etc.). 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
See GetIsImmune for some notes on the different IMMUNITY_TYPE_* constants. 
You can only define one Immunity per effect but by using EffectLinkEffects(effect1,effect2) you can continuously add them together into one giant effect. 
Immunities are general very powerful, and usually only meant for NPC's. They provide immunities to certain effects (but not all of them) most of which are pretty obvious. 
Once a person is immune, it doesn't mean they will have current effects removed or even hampered - making someone immune to stunning when they are stunned is obviously only going to stop further uses of EffectStunned() on the target, not remove the effect they are currently under. 
Because of this, obviously, you can just loop effects and remove all of them of that subtype - the spell Freedom of Movement does this. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Note if nImmunityType value is 0 - IMMUNITY_TYPE_NONE - it actually means "Immunity: All" - you get immunity to all effects that are defined as IMMUNITY_TYPE_*! Possibly useful I guess for bosses. 
The icon used for each immunity is defined in effecticons.2da - so they can be changed to be different for each immunity type (and change the name too). 
There are some bugs with invalid values; 
  * -1 or lower, you get the value altered to 0 - "Immunity: All"
  * 33 or higher - it gets put to 33. This is not a valid immunity number, and GetIsImmune(oTarget, 33); does not return TRUE (it seems to only accept values 1 through 32). It also defaults to an icon that just says "Immunity" (line 9 in effecticons.2da). However this may have some uses: 
    * Since the icon is otherwise unused, a new effect using that effecticons.2da line can be done which shows up on character sheets. It's not a hostile effect so will affect everything (eg; plot, immortal, hostile, non-hostile, immune creatures).
    * You can use it as a generic "Immunity" granted from a spell or ability, which is entirely scripted (using GetEffectInteger on immunity effects to check for it).

Oddly the item property ItemPropertyImmunityMisc has only a third or so of immunities this function can accept. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nImmunityType | The IMMUNITY_TYPE_* applied. Note bug above.   
1 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
2 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
3 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
#### Known Bugs
EffectImmunity(33) or higher applies an "invalid" immunity - although notably somewhat useful as per above (additional effecticons.2da line is usable). 
#### Version
1.62 
#### Example
// Sample code for applying immunity to critical hits to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eImmune = EffectImmunity(IMMUNITY_TYPE_CRITICAL_HIT); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_GOOD_HELP); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eImmune, oTarget);}
#### See Also
functions:  |  GetIsImmune ItemPropertyImmunityMisc  

constants:  |   IMMUNITY_TYPE_* Constants
