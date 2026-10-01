<!-- Source: https://nwnlexicon.com/index.php/EffectMovementSpeedIncrease -->

# EffectMovementSpeedIncrease(int)
Create a Movement Speed Increase effect to speed target movement rate. 
effect EffectMovementSpeedIncrease( int nPercentChange);
#### Parameters 

nPercentChange
    Percentage change in movement speed
#### Description
Returns a new effect object that when applied to a target will speed their rate of movement by nPercentChange percent. 
nPercentChange is very odd especially since negative values can be used to bypass immunities. This is what occurs when different values are put in: 
  * Values under 100 have 100 added to them. -50 will become 50. 50 will become 150.
  * Values 100 or higher will be kept the same, so 150 will stay 150. 300 will stay 300.

As per the effect breakdown, the value is applied as a multiplier (eg; nPercentChange being 300 will do a * 3.0 multiplier) against the current movement speed applied, then this is capped at a maximum of 150% of usual speed (1.5 multiplier). See breakdown for calculation details. 
The default Bioware values are still reasonably accurate (if you take it "as a portion of current speed" and knowing about the 150% cap). 
  * -99 = almost twice as slow
  * -50 = 50% slower
  * 0 = no change in speed
  * 50 = 50% faster
  * 99 = almost twice as fast
  * 150 = 150% faster

The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
There is also a default cap of 150% movement speed increase factor for the combination of movement from this effect. Monks get an exception and anyone with CLASS_TYPE_MONK get a maximum of 300%. It appears there is a lower limit of 12.5% movement speed when decreases are applied. These can be altered with ruleset.2da changes. 
The EffectHaste (and Haste items) apply a hidden EffectMovementSpeedIncrease(50) as part of it's effects. 
This effect is **not** stopped with immunity to movement speed decreases. It can be used with negative value to create a slowing effect which will ignore all immunities. 
A quick note is that all PC movement rates are 2.00, as defined in CreatureSpeed.2da. That is their walkrate, their runrate is 4.00. This is the amount of distance, in meters, they can cover in one second. 
There is no way to directly change a PC's movement speed (say, to 5.00 meters a round) at a base level. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Barbarian Endurance
FEAT_BARBARIAN_ENDURANCE - Will apply an additional 0.1 speed to whatever total speed bonus/penalty. EG: at nPercentChange = 25, meaning effects total of 1.25 multiplier you'd end up * 1.35 speed 
#### Monk Speed
Monks get, for some reason, an increased effect cap to movement speed of x3 (or 300%) at level 3 onwards. This increases the cap of these magical effects. 
Then Monks with FEAT_MONK_ENDURANCE will apply an additional **additive** +0.1 speed every 3 levels. If you've got movement speed increases at 300% - a x3.00 multiplier - at level 40 you'd add 40/3 = 13 increases, or 1.3 increase so a crazy total of 4.3 speed multiplier or around 16 or 17 meters per second. 
#### Cutscene Remarks
Cutscene speed is pre-set (and likely removes the Monk and Barbarian speeds) since the "camera" is the player themselves. In cases you need to alter this speed use SetCutsceneCameraMoveRate not this effect. 
#### Effect Breakdown
The effect is multiplicative. You don't add up the amounts and multiply them once, you multiply each one in turn. Having 2x 20% increases with no other effects will go: 
  * 1.0 * 1.2 = 1.2
  * 1.2 * 1.2 = 1.44

Instead of adding them up, such as 20% + 20% = 40% thus 1.4 total multiplier. 
Previous bugs when applying no longer apply. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPercentageChange | If you put in < 100 it will add 100 to it and store it here. It will do nPercentageChange/100.0 (as a float) to work out the multiplier. EG: 125 here would give 1.25. -50 would give -0.5, etc.   
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. Fixed stacking and cap of EffectMovementSpeed{Increase,Decrease}(). 
#### Example
// Sample code for applying a 50% movement speed increase// bonus to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eGoFast = EffectMovementSpeedIncrease(50); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HASTE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eGoFast, oTarget);}
#### See Also
functions:  |  EffectMovementSpeedDecrease
