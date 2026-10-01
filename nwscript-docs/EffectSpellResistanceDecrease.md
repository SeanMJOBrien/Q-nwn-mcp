<!-- Source: https://nwnlexicon.com/index.php/EffectSpellResistanceDecrease -->

# EffectSpellResistanceDecrease(int)
Returns a Spell Resistance Decrease effect. 
effect EffectSpellResistanceDecrease( int nValue);
#### Parameters 

nValue
    Amount of spell resistance decrease, 0 - 128.
#### Description
Returns an effect which decreases spell resistance by nValue. If nValue is less than 1, nothing happens. Value is capped to 128. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This specifically only counters EffectSpellResistanceIncrease and item properties that have set spell resistance. It does not, for whatever reason, stop Monks SR feat Diamond Soul (rather frustratingly!), an odd design decision by Bioware since Monks can get to essentially unbeatable amounts of SR. 
You only ever get the highest negative Spell Resistance Decrease applied, for instance if you have EffectSpellResistanceIncrease(20) and EffectSpellResistanceDecrease(5) and EffectSpellResistanceDecrease(10) you'd end up with 10 spell resistance (20 - 10) not 5 spell resistance (20 - 10 - 5). 
The effect will take place immediately and affect ResistSpell checks (if used in a spell script) plus GetSpellResistance. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Once applied this effect will alter the spell resistance if it is a bigger penalty than the previous resistance decreases. On removal it calculates the correct next biggest resistance decrease. As above they don't stack, only the highest applies. 
It is not possible to have this in VersusAlignmentEffect in spite of the fact Bioware tries to do this for some spells. 
The value 0 is actually valid, although obviously this doesn't do anything. 
Spell resistance shows up on the players character sheet when altered by this and an effect icon will be applied. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nValue | The amount of spell resistance decrease this effect is applying.   
#### Known Bugs
As noted above there is no way to decrease the Monks feat Diamond Soul spell resistance, which seems hardcoded into being never decreased for some reason. 
#### Version
1.62 
#### Example
// Sample code for applying a 10 decrease in spell resistancevoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eSR = EffectSpellResistanceDecrease(10); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SPELL_MANTLE_USE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eSR, oTarget);}
#### See Also
functions:  |  ApplyEffectToObject EffectSpellResistanceIncrease ResistSpell GetSpellResistance
