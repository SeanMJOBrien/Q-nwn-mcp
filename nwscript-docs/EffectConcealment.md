<!-- Source: https://nwnlexicon.com/index.php/EffectConcealment -->

# EffectConcealment(int)
Returns a new Concealment effect. 
effect EffectConcealment( int nPercentage, int nMissType = MISS_CHANCE_TYPE_NORMAL);
#### Parameters 

nPercentage
    1-100 inclusive 

nMissType
    Refer to  MISS_CHANCE_TYPE_* Constants.
#### Description
This function returns a new concealment effect. The nPercentage int is simply the chance of discovery so a 0 concealment would be Shamu hiding in your tub and a 100 concealment would be a brine shrimp hiding in Shamu's tub. The nMissType parameter is one of a set of predefined constants specifying whether the concealment effect applies to melee attacks, ranged attacks, or both. 
Concealment doesn't stack, only the highest applies, therefore Ghostly Visage doesn't stack with a monk's Perfect Body. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Concealment should NOT be confused with EffectMissChance() - this HELPS the creature targeted, and all attacks (physical ones, ranged or melee) which are targeted that the creature may miss if this is in effect. 
It is reported in the combat information as "Target Concealed: Miss". 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirstEffect()/GetNextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Pretty simple one this - when an attack is made against a creature with concealment the highest applies. 
The two variants - ranged and melee concealment - don't stack as such. Instead if you make a ranged attack you only get those concealments applied as normal or vs. ranged, and if it instead a melee attack you get normal ones and those vs. melee. These concealments also apply appropriately to TouchAttackMelee and TouchAttackRanged. 
Note that EffectInvisibility _doesn't_ seem to inherently apply a concealment effect, because it calculates things such as "does the attacker have trueseeing" or other ways to get past the invisibility concealment chance, while this effect has no inherent counter other than FEAT_BLIND_FIGHT which allows a reroll. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPercentage |   
1 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
2 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
3 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | Miss Chance Type | It does not directly translate the MISS_CHANCE_TYPE_* values instead it is: 0 = MISS_CHANCE_TYPE_NORMAL 2 = MISS_CHANCE_TYPE_VS_RANGED (instead of the expected 1)3 = MISS_CHANCE_TYPE_VS_MELEE (instead of the expected 2) The missing "1" value appears to be "MISS_CHANCE_TYPE_DARKNESS" which is unavailable to us, and used solely in parts of EffectDarkness internally so not accessible via. nwscript.   
#### Version
1.62 
#### Example
// We apply a 30% concealment to those who step into the trigger// as the trigger is behind some cover or something...void main(){ // Declare object and effect object oEnterer = GetEnteringObject(); effect eConceal = EffectConcealment(30); // Apply the effect ApplyEffectToObject(DURATION_TYPE_PERMANENT, eConceal, oEnterer);}
#### See Also
functions:  |  EffectMissChance  

constants:  |   MISS_CHANCE_TYPE_* Constants
