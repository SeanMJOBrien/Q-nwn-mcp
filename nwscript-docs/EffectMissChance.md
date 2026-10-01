<!-- Source: https://nwnlexicon.com/index.php/EffectMissChance -->

# EffectMissChance(int, int)
Creates a miss chance effect. 
effect EffectMissChance( int nPercentage, int nMissChanceType = MISS_CHANCE_TYPE_NORMAL);
#### Parameters 

nPercentage
    1-100 inclusive 

nMissChanceType
    Refer to  MISS_CHANCE_TYPE_* Constants.
#### Description
Returns a new effect used to hinder the attacks of a creature it is applied to. 
A miss chance percent of 20 with MISS_CHANCE_TYPE_ALL means that there is a 20% chance, each melee, ranged or touch attack (even if it misses naturally) that the attack will outright miss. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or nPercentage > 100. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
A drunk creature, or one hindered by a particular spell might have this applied to them - there is no default Bioware spell which uses this. 
Do NOT confuse this with EffectConcealment which PROTECTS the creature it is applied to. This hinders attacks - not helps them. 
It also doesn't stack - as EffectConcealment, only the highest "To miss" chance applies. Note that Blindness has a 50% miss chance-type effect, as they are blind. 50% is meant to be the highest chance of missing a target (someone in full cover). 
It is reported in the combat information as "Attacker Miss Chance XXX%." in normal colors, when they do miss due to this effect. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
As noted EffectConcealment is very similar in so far as how the miss chances work (see notes below for GetEffectInteger notes). The highest applies, either of miss chance (eg; you're blind, or have this effect) or the target is invisible/concealed. 
EffectBlindness applies a 50% miss chance, ala EffectMissChance(50, MISS_CHANCE_TYPE_NORMAL). 
EffectDarkness applies a special 50% miss, ala EffectMissChance(50, MISS_CHANCE_TYPE_DARKNESS) - note there is no such constant, you can't create this outside of using EffectDarkness. 
Unlike many other negative and positive effects this one has _no_ effect icon. There doesn't even seem to be a missing one in effecticons.2da either. 
Unlike EffectConcealment there is no racial type or alignment this can be tied to. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPercentage |   
1 | Miss Chance Type | It does not directly translate the MISS_CHANCE_TYPE_* values instead it is: 0 = MISS_CHANCE_TYPE_NORMAL 2 = MISS_CHANCE_TYPE_VS_RANGED (instead of the expected 1)3 = MISS_CHANCE_TYPE_VS_MELEE (instead of the expected 2) The missing "1" value appears to be "MISS_CHANCE_TYPE_DARKNESS" which is unavailable to us, and used solely in parts of EffectDarkness internally so not accessible via. nwscript.   
#### Version
1.62 
#### Example
// On a lever, we apply a 50% miss chance (50% of the time,// the targets attacks just miss) on the user of it.void main(){ // Declare object and effect object oUser = GetLastUsedBy(); effect eMiss = EffectMissChance(50, MISS_CHANCE_TYPE_NORMAL); // Apply it to them forever (or until they rest) ApplyEffectToObject(DURATION_TYPE_PERMAMENT, eMiss, oTarget);}
#### See Also
functions:  |  EffectConcealment  

constants:  |   MISS_CHANCE_TYPE_* Constants
