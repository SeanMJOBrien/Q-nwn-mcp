<!-- Source: https://nwnlexicon.com/index.php/EffectCutsceneParalyze -->

# EffectCutsceneParalyze()
Creates an effect that will always paralyze a creature. 
effect EffectCutsceneParalyze();
#### Description
Returns an effect that is guaranteed to paralyze a creature; this effect is identical to EffectParalyze except that it cannot be resisted. 
See notes for EffectParalyze for more remarks, code and description. 
This effect is less required with the SetCutsceneMode function, but may still be useful for other reasons. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This was used in older cutscenes, now you should use SetCutsceneMode on players, however an effect that does paralysis without resistance can still be useful for spells and abilities. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
The effect has a single variable with the internal "complex state" of CREATURE_STATE_CUTSCENE (value 20) applied. 
It's essentially very similar to EffectParalyze but with no effect icon. The same AI states are changed (~AISTATE_CREATURE_USE_LEGS & ~AISTATE_CREATURE_USE_HANDS & ~AISTATE_CREATURE_USE_MOUTH) and the creature is set to uncommandable. 
Some other oddities: 
  * EffectParalyze will stop some animations (when being whacked) while EffectCutsceneParalyze acts like you are just normal.
  * You can't coup de grace EffectCutsceneParalyze

However it stops all other usual things (spellcasting, movement, attacks, etc.) and has the other effects (AC may decrease etc.). 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 20, CREATURE_STATE_CUTSCENE |   
#### Version
1.62 
#### Example
// See EffectParalyze notes for code.
#### See Also
functions:  |   EffectParalyze
