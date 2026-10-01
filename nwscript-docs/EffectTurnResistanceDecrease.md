<!-- Source: https://nwnlexicon.com/index.php/EffectTurnResistanceDecrease -->

# EffectTurnResistanceDecrease(int)
Create a Turn Resistance Decrease effect that can make creatures more susceptible to turning. 
effect EffectTurnResistanceDecrease( int nHitDice);
#### Parameters 

nHitDice
    A positive number representing the number of hit dice for the decrease
#### Description
Returns a new effect object that when applied to a target will decrease their resistance to turning as if they were nHitDice in lower levels. 
The limit of nHitDice is unknown. 
The target this effect is applied to must be a creature for it to work. For some reason it cannot be applied to PCs. 
It should not be applied instantly, instead only temporarily or permanently. 
#### Remarks
This changes the value returned by GetTurnResistanceHD(), which is added to the creature's hide bonus to turn resistance, and is called in the turn undead script. This lowers te value. 
It is similar to the bonuses you can put onto a creatures hide, however, it is obviously going to stack with them also and decrease them. It should be possible to decrease turn resistance of those even without any. 
The basis of knowing what this means is: If I am a 5HD undead monster, with a -1 to my turn resistance, I act as if I was a 4HD undead monster, thus easier to turn. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Since this literally only affects GetTurnResistanceHD, and simply will check the decreases and increases, and total them all up. Pretty simple stuff. 
nHitDice hasn't got any range limit checks on it - you can have a negative decrease, ie a positive, using this effect. 
There is no immunity to this effect except, amusingly, being a PC makes it impossible to apply. 
There is no effect icon for this effect. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nHitDice | The decrease to apply (or if a negative number, the increase).   
#### Known Bugs
This effect doesn't operate on PC's, which is a bizarre restriction given the amount of polymorphs that alter their race to mean they can be turned by Turn Undead. Given Bioware doesn't use this effect in a default script however it is unlikely they ever realised this issue. 
There is no effect icon for this effect. 
#### Version
1.62 
#### Example
// Sample code for applying 1 turn resistance damage to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eTurnDec = EffectTurnResistanceDecrease(1); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eTurnDec, oTarget);}
#### See Also
functions:  |  GetTurnResistanceHD EffectTurnResistanceIncrease
