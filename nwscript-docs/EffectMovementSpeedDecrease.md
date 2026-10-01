<!-- Source: https://nwnlexicon.com/index.php/EffectMovementSpeedDecrease -->

# EffectMovementSpeedDecrease(int)
Create a Movement Speed Decrease effect to slow target. 
effect EffectMovementSpeedDecrease( int nPercentChange);
#### Parameters 

nPercentChange
    Percentage to decrease the movement speed by. Must be a maximum of 99.
#### Description
Returns a new effect object that when applied to a target will slow their movement by nPercentChange percent. 
As defined by Bioware, nPercentChange: 
  * 0 = no change in speed
  * 50 = 50% slower
  * 99 = almost immobile

The nPercentChange value is hard capped to 99, but for some reason allows negative values. This means you can have a movement speed decrease of -50 and it will increase your speed by 50%. 
Also note that EffectCutsceneImmobilize is a better way of stopping the creature moving at all (and cannot be resisted, like this can). 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
There is also a default cap of minimum 0.125% movement speed increase factor for the combination of movement from this effect. The caps can be altered with ruleset.2da changes. 
This effect is stopped with immunity to movement speed decreases - IMMUNITY_TYPE_MOVEMENT_SPEED_DECREASE. 
This effect is used by EffectSlow, essentially providing a hidden EffectMovementSpeedDecrease(50). 
A quick note is that all PC movement rates are 2.00, as defined in creatureSpeed.2da. That is their walkrate, their runrate is 4.00. This is the amount of distance, in meters, they can cover in 1 second. There is no way to directly change a PC's base movement speed (say, to 5.00 meters a round). 
#### Effect Breakdown
This means the effect is multiplicative not additive. Having 2x 20% decreases with no other effects will go: 
  * 1.0 * 0.8 = 0.8
  * 0.8 * 0.8 = 0.64

Instead of totalling them up and applying the final multiplier, so it is not 20% + 20% = 40% decrease, so 1.0 * 0.4 = 0.4 speed. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPercentageChange | Keeps it in the input format, and does 1.0 - nPercentageChange (as a float) to work out the multiplier. EG: 25 here would give 1.0 - 0.25 = a multiplier of 0.75 to apply.   
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. Fixed stacking and cap of EffectMovementSpeed{Increase,Decrease}(). 
#### Example
// Sample code for applying a 50% movement speed decrease// penalty to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eSlowDown = EffectMovementSpeedDecrease(50); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SLOW); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eSlowDown, oTarget);}
#### See Also
functions:  |   EffectMovementSpeedIncrease
