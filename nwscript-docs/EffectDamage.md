<!-- Source: https://nwnlexicon.com/index.php/EffectDamage -->

# EffectDamage(int, int int)
Creates a damage effect. 
effect EffectDamage( int nDamageAmount, int nDamageType=DAMAGE_TYPE_MAGICAL, int nDamagePower=DAMAGE_POWER_NORMAL);
#### Parameters 

nDamageAmount
    amount of damage to be dealt. The game limits this number to 1 - 10000, anything above or below this range gets defaulted to 1 damage. This should be applied as an instantaneous effect. 

nDamageType
    The type of damage to apply, one of the  DAMAGE_TYPE_* constants. (Default: DAMAGE_TYPE_MAGICAL). If an invalid value is provided (such as DAMAGE_TYPE_BASE_WEAPON) it defaults to DAMAGE_TYPE_MAGICAL. 

nDamagePower
    The  DAMAGE_POWER_*  to apply for physical damage types to go through EffectDamageReduction effects. **NOTE:** This is bugged in versions before NWN:EE version 1.87.8193.35 and simply doesn't do anything see Known Bugs. (Default: DAMAGE_POWER_NORMAL)
#### Description
This function creates a new Damage Effect that causes The amount of Damage Specified in the first parameter, the type of damage defined in the second and the damage power (for breaching a creatures natural damage reduction with physical damage) with the third Parameter. 
Whoever calls the ApplyEffectToObject with EffectDamage is considered the damager, and the message to players usually names it. Useful to know if you want the PC to be the damager, but another script is performing the task (for example, a unique power). 
The target this effect is applied to must be an object with valid hit points for it to work. This effect can only be applied instantly. 
It is highly recommended to use DelayCommand with a value higher than 0.0 while applying a damage effect since the scripts such as OnDamaged script triggers as soon as the damage effect is applied, which runs a script before returning to the parent script if left without a delay. The main issue this may cause is that GetFirstObjectInShape style loops can become reset when the AI scripts fire, potentially repeating the loop and TMI errors occur (eg the same creature gets constantly damaged, worse still they might heal in their OnDamaged script, or be plot so not be damaged). If you capture all the things to damage in an area in an JsonArray or similar you might be able to apply damage instantly if required (eg in a traps trigger script), or if there is only one single target it is usually fine to apply damage instantly, but be aware that scripts can fire when EffectDamage is applied before it returns to the ApplyEffectToObject call. Note EffectDeath calls its OnDeath script with a 0.0 delay internally so is slightly safer to apply instantly. 
#### Remarks
Damage is the basis for a lot of killing scripts - from Fireball to Acid Fog, and even powers like Lay on Hands (when used on undead). This is instantly applied damage, and may kill a target (if they drop to 0 HP for monsters, or -11 HP for PC's). 
When a creature is killed by damage, it will be gibbed (explode) if the damage number is >= Creature HP / 2 and the damage makes the NPC be at -11 or lower HP (ie; a creature with 100HP will need 50 or more applied in one go damage effect/hit be gibbed, and thus be at 50 - 11 = 39HP at the time the damage is applied). This obviously doesn't apply to PCs who go through the OnPlayerDying event first (and can't be gibbed). To have this happen regardless of HP, EffectDeath() has a parameter for it. 
With the patch/HotU release, 1.59, you can add all damage types (even magical, stupidly) to items as properties. Big note: This is for NPC's only, and PC's should never be able to resist divine or magical damage! 
The message in the combat box is reported as "So and So damages Whoever for 5 XXX damage", where XXX is the damage type - which is highlighted in different colors to easily show what is what. So and So is the creator of the effect (from the script it is called on) and the Whoever is the target (even you). 
Also note that for non-physical damage (anything that isn't Bludgeoning, Slashing or Piercing), the last parameter, the damage power, will never be in effect since it always penetrates EffectDamageReduction. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
EffectDamage is a special effect type with more than the typical 8 GetEffectInteger values. It in fact has 37 possible values. Given that EffectDamage is applied instantly however it is unlikely you'd ever need to inspect the effect since at creation you can define the parameters. Some are also only tied to weapon attacks it seems. 
The reason for so many appears to be that EffectDamage technically _could_ apply more than one damage type in one effect, however it appears doing EffectDamage(10, DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_PIERCING); doesn't apply more than one (it does the highest numeric DAMAGE_TYPE_* value if you wondered, in this case DAMAGE_TYPE_PIERCING). It'd certainly be fun to see how this works and interacts with damage reductions/resistances, it likely applies each damage separately OR it checks for the best one to use (eg; a Slashing + Piercing weapon will look for the best damage of the two to do against a target). 
When applied various calculations are done to get the "real" amount of damage to deal, ie; Damage Reduction/Damage Resistance/Damage Immunity - this interaction needs to be fully tested however. 
Once the calculated final damage is done it then also may do these in built things: 
  * Interrupt concentration if the target is casting a spell
  * If the target is EffectCharmed/EffectDominated and the damage is from the same faction, it should clear it (and make the creature angry if they were not already).
  * If the target is under EffectSleep they should wake up
  * The OnDamaged event is fired
  * EffectDeath is applied if the target has reached death thresholds (as above, with massive explody effects possibly), or OnPlayerDying starts if the PC is between 0 and -10 HP.
  * Applies appropriate reaction "animations" on the target being hit.

In earlier NWNS version nDamagePower is not used due to a bug. As of NWN:EE patch 1.87.8193.35, it was patched and is functional again. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | Amount of Bludgeoning Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_BLUDGEONING   
1 | Amount of Piercing Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_PIERCING   
2 | Amount of Slashing Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_SLASHING   
3 | Amount of Magical Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_MAGICAL   
4 | Amount of Acid Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_ACID   
5 | Amount of Cold Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_COLD   
6 | Amount of Divine Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_DIVINE   
7 | Amount of Electrical Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_ELECTRICAL   
8 | Amount of Fire Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_FIRE   
9 | Amount of Negative Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_NEGATIVE   
10 | Amount of Positive Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_POSITIVE   
11 | Amount of Sonic Damage | Is set to -1 if nDamageType is not set to DAMAGE_TYPE_SONIC   
12 | DAMAGE_TYPE_BASE_DAMAGE | This isn't set for EffectDamage but presumably is a flag that marks the damage as coming from a weapon for the purposes of GetDamageDealtByType.   
13 - 31 | Amount of potential custom damage type | Is set to -1 if nDamageType is not set to the matching integer.   
32 | "bClientDisplay" | Something to do with animations. Not set for EffectDamage.   
33 | 1000 | It's just set to 1000. Appears to be animation time related, so all EffectDamage applications will cause the same animation timings (presumably reaction to the damage).   
34 | nDamageFlags | Unknown what nDamageFlags includes or what it does - obviously is not set for EffectDamage.   
35 | nDamagePower | Although note this appears not to be in use.   
36 | "CombatDamage" | Not used for EffectDamage, used for weapon attacks presumably.   
37 | "RangedAttack" | Not used for EffectDamage, used for weapon attacks presumably.   
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. You can now add new custom damage types. Additionally EffectDamage now correctly works with damage power for physical damage types to properly penetrate EffectDamageReduction. 
#### Example
// Sample code for applying 10 fire damage to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDamage = EffectDamage(10, DAMAGE_TYPE_FIRE); // Create the visual portion of the effect. effect eVis = EffectVisualEffect(VFX_IMP_FLAME_M); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_INSTANT, eDamage, oTarget);}
#### See Also
constants:  |   DAMAGE_TYPE_* Constants
