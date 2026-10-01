<!-- Source: https://nwnlexicon.com/index.php/EffectPetrify -->

# EffectPetrify()
Creates an effect that will petrify a creature. 
effect EffectPetrify();
#### Description
Returns an effect that will petrify a creature. The creature receives a effect similar to EffectParalyze, and the stoneskin visual effect is also applied (VFX_DUR_PETRIFY). 
Petrified should act as if paralyzed, so creatures cannot move or perform actions, and have 3 Dexterity, and all the penalties for prone creatures (lack of dodge AC, attackers get attack bonuses). 
Petrify doesn't make it harder to kill you or another, because it provides no protection (as in, no damage reduction), just paralysis and the VFX. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Petrified creatures do just become statues. Bioware uses a wrapper for applying its own petrify, which will bring up a death panel with "Exit" and "Wait for Help" options, but no respawn option, as it isn't actual death. 
You should always really use the wrapper in the file x0_i0_spells against PC's or monsters in a spell. It works a lot better that way. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Essentially this applies special creature state of type "CREATURE_STATE_PETRIFIED" (15), applies VFX_DUR_PETRIFY, VFX_DUR_FREEZE_ANIMATION and a petrify effect icon. 
The practical effects are: 
  * It sets similar AISTATE to EffectParalyze: ~AISTATE_CREATURE_USE_LEGS & ~AISTATE_CREATURE_USE_HANDS & ~AISTATE_CREATURE_USE_MOUTH 
    * No Legs - No movement can take place (counts as flatfooted applying various penalties)
    * No Hands - No spells with somatic components can be cast (also counts as flatfooted applying various penalties)
    * No Mouth - No spells with verbal components can be cast
  * Creature is set to uncommandable.

It also differs from other _main_ creature states since: 
  * There is no statescript.2da entry that runs
  * There is no IMMUNITY_TYPE_PETRIFY (instead Bioware coded one based on appearance)

It shares these differences with some other creature state effects, like Cutscene Immobilize and Cutscene Paralyze, but those are meant to bypass immunities. It is a shame Bioware never added an immunity for petrification! Although one advantage of this effect is it is only ever created using this function, no item properties apply it. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 15, CREATURE_STATE_PETRIFIED |   
#### Version
1.62 
#### Example
// Sample code for applying petrify (petrifiesis?) to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect ePetrify = EffectPetrify(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HEAD_ODD); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, ePetrify, oTarget);}
#### See Also
functions:  |   Petrify  EffectParalyze  

constants:  |   VFX_DUR_* Constants
