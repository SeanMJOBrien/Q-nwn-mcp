<!-- Source: https://nwnlexicon.com/index.php/EffectRegenerate -->

# EffectRegenerate(int, float)
Create a Regenerate effect. 
effect EffectRegenerate( int nAmount, float fIntervalSeconds);
#### Parameters 

nAmount
    Amount of damage to be regenerated per time interval 

fIntervalSeconds
    length of interval in seconds
#### Description
Returns a new effect object that when applied, will cause the target to heal at the rate of nAmount every fIntervalSeconds. 
Because effects are wiped by the internal engine when a PC or NPC goes below 1 hit point, this effect cannot be used to heal a dying PC. 
But, items with the property Regeneration will work when a PC is dying, strangely enough! And normally means they raise back from the dying status. At -11, they are dead normally. Regeneration items (which should be deadly rare) and dying scripts do not go together. 
The limit of nAmount and fIntervalSeconds are unknown. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This doesn't remove Wounding (from on hit properties) or EffectHitPointChangeWhenDying effects, as it isn't an actual Healing effect, as such. But note having an identical EffectHitPointChangeWhenDying damage effect as you have regeneration effect can mean being in "dying limbo". 
It cannot be used to heal anything but creatures. 
The main benefit of it is certainly that the PC doesn't have to do so many castings or drinkings of healing spells in a longer battle or set of battles, and the spell might eventually heal as much or more then any equivalent one-shot healing spell might. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Essentially when the game is parsing effects, it checks the timing - if we've elapsed the right number of milliseconds in the world timer, we apply EffectHeal (with the relevant feedback that effect has). 
If we're at full health the game waits until we take any damage and starts the timer at that point, since damage is then healed. So if you apply a 6 second interval, and take damage half way through a "combat round" it'll start healing then, then 6 seconds later again half way through the combat round. 
You can use a negative number for nAmount, but please don't - see known bugs. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAmount | Amount to heal per interval   
1 | fIntervalSeconds * 1000 | The interval amount in milliseconds (thus 3.0 becomes 3000)   
2 | Day Effect Applied | Internal "day" record when the effect was first applied, then updated every time healing is done to keep track of "last time healed"   
3 | Millisecond Effect Applied | The millisecond the effect was applied, then updated every time healing is done to keep track of "last time healed"   
#### Known Bugs
A negative nAmount does work but bugs the creature out immensely - they don't "die" when hitting 0 HP. The effect also only takes place when the HP is lower than 100%. The limbo dead state is not a good one to be in - it sometimes randomly jumps you around and restores to 1 HP, will stop various actions. It's a mess. 
#### Version
1.62 
#### Example
// Sample code for applying a regeneration rate of 1 Hit Point// every 3 seconds to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eRegen = EffectRegenerate(1, 3.0); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HEAD_NATURE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eRegen, oTarget);}
#### See Also  
---
