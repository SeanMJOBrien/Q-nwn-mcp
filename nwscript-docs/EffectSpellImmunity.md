<!-- Source: https://nwnlexicon.com/index.php/EffectSpellImmunity -->

# EffectSpellImmunity(int)
Returns an effect of spell immunity. 
effect EffectSpellImmunity( nImmunityToSpell=SPELL_ALL_SPELLS);
#### Parameters 

nImmunityToSpell
    Spell (by spells.2da line or  SPELL_* constant) to be immune to or SPELL_ALL_SPELLS for all spells.
#### Description
Returns an effect of spell immunity to SPELL_* type spells. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nImmunityToSpell is invalid. 
nImmunityToSpell can be any integer value from the spells.2da file (thus constants SPELL_* are valid), or SPELL_ALL_SPELLS for all spells. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This will provide direct and total immunity to nImmunityToSpell, *if* that spell uses the function ResistSpell within it. 
The fact that no friendly spell uses ResistSpell means that friendly spells will never be resisted, directly or not. 
Also, natural abilities obviously are not spells, so will also not be affected by this. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This is a reasonably simple effect structure that simply has one integer for the spell to resist, or SPELL_ALL_SPELLS (-1). 
It cannot itself be "used up" like EffectSpellLevelAbsorption so there is no problem linking it to other effects and it "running out". 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nImmunityToSpell | -1 for SPELL_ALL_SPELLS or a spells.2da referenced line (0 through...whatever).   
#### Known Bugs
Previously noted bug has been fixed in a patch some time ago. 
#### Version
1.62 
#### Example
// Sample code for applying direct Immunity to the Fireball spell,// to a target (lucky him!)void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eImmunity = EffectSpellImmunity(SPELL_FIREBALL); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_MAGIC_RESISTANCE_USE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eImmunity, oTarget);}
#### See Also
functions:  |  EffectSpellLevelAbsorption EffectSpellResistanceIncrease EffectSpellResistanceDecrease ResistSpell  

constants:  |   SPELL_* Constants
