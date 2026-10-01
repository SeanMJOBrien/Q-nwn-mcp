<!-- Source: https://nwnlexicon.com/index.php/EffectDamageImmunityIncrease -->

# EffectDamageImmunityIncrease(int, int)
Creates a Damage Immunity Increase effect 
effect EffectDamageImmunityIncrease( int nDamageType, int nPercentImmunity);
#### Parameters 

nDamageType
    DAMAGE_TYPE_* to increase immunity to 

nPercentImmunity
    The percent amount to raise the targets immunity by. Must be 0 to 100.
#### Description
Returns a new effect object that when applied to a target will raise the amount of immunity the target has against damage when it is done to them by a certain type defined in the DAMAGE_TYPE constants group. 
This effect means a nPercentImmunity of 50% to fire damage translates to half damage from any fire attacks - if we take 50 fire damage normally, this means we only take 25. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This will decrease damage done to the target if it had no immunity to start with - noting that all increases and decreases of immunity to damage will stack (on hides, items, from effects or whatever) and the maximum is going to be 100% vulnerability (decrease immunity, double damage) or 100% immunity (increased immunity, no damage). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Damage immunity increases from EffectDamageImmunityIncrease are added up and the decreases from EffectDamageImmunityDecrease are taken off, to get a final "Immunity amount". 
However there is an oddity here; it only checks for the current immunity value at the time. For instance these are the results of applying effects in order: 
  * No effects - normal damage will apply
  * EffectDamageImmunityIncrease(DAMAGE_TYPE_MAGICAL, 100) - 0 damage will apply
  * EffectDamageImmunityIncrease(DAMAGE_TYPE_MAGICAL, 100) - 0 damage will apply
  * EffectDamageImmunityDecrease(DAMAGE_TYPE_MAGICAL, 100) - Normal damage will apply

Note how the increases (adding up to 200%) do not properly get calculated before the decrease (-100%) is applied. Very strange - usually Bioware checks for existing effects to summarise the amount of something, eg; AC, not just alter the pre-set value. 
This is capped at +100% immunity and down to a minimum of -100% vulnerability. Example effects: 
  * +100% - Totally immune to all damage of that type, eg 10 damage becomes 0 damage
  * 50% - Takes 50% of the damage dealt by that type off the total amount, eg: 10 damage becomes 5 damage
  * -50% - Adds 50% more on, so 10 damage becomes 15 damage
  * -100% - Adds 100% more on, so 10 damage becomes 20 damage

When damage is applied to an object, it goes through this order: EffectDamageImmunity -> EffectDamageResistance -> EffectDamageReduction. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nDamageType -  DAMAGE_TYPE_*  constants group. | Damage the immunity is for.   
1 | nPercentImmunity | Percentage of immunity from this effect.   
#### Known Bugs
As per the above example you can get instances of the wrong immunity percent being applied when already at a the cap, either -100 or +100, when a new immunity increase or decrease is applied. 
#### Version
1.62 
#### Example
// Sample code for applying a bonus 50% fire immunity to a // target (thus, they'll take 50% less damage from fire attacks)void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDamageImmunityIncrease = EffectDamageImmunityIncrease(DAMAGE_TYPE_FIRE, 50); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SUPER_HEROISM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDamageImmunityIncrease, oTarget);}
#### See Also
functions:  | EffectDamageImmunityDecrease  

constants:  | DAMAGE_TYPE_* Constants
