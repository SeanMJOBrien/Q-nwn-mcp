<!-- Source: https://nwnlexicon.com/index.php/EffectTurnResistanceIncrease -->

# EffectTurnResistanceIncrease(int)
Create a Turn Resistance Decrease effect that can make creatures more resistant to turning. 
effect EffectTurnResistanceIncrease( int nHitDice);
#### Parameters 

nHitDice
    A positive number representing the number of hit dice for the increase
#### Description
Returns a new effect object that when applied to a target will increase their resistance to turning as if they were nHitDice in higher levels. 
The limit of nHitDice is unknown. 
The target this effect is applied to must be a creature for it to work. For some reason it cannot be applied to PCs. 
This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This changes the value returned by GetTurnResistanceHD(), which is added to the creature's hide bonus to turn resistance, and is called in the turn undead script. This increases the value. 
It is similar to the bonuses you can put onto a creatures hide, however, it is obviously going to stack with them. It should be possible to increase turn resistance of those even without any. 
The basis of knowing what this means is: If I am a 5HD undead monster, with a +2 to my turn resistance, I act as if I was a 7HD undead monster, thus harder to turn. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Since this literally only affects GetTurnResistanceHD, and simply will check the decreases and increases, and total them all up. Pretty simple stuff. 
nHitDice hasn't got any range limit checks on it - you can have a negative increase, ie a negative, using this effect. 
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
// Sample code for applying a 5 bonus to turn resistance to// a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eTurnInc = EffectTurnResistanceIncrease(5); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_IMPROVE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eTurnInc, oTarget);}
#### See Also
functions:  |   GetTurnResistanceHD
