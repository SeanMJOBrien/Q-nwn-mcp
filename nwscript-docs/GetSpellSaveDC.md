<!-- Source: https://nwnlexicon.com/index.php?title=GetSpellSaveDC&amp;action=history -->

# GetSpellSaveDC()
Determines the DC needed to save against the cast spell. 
int GetSpellSaveDC();
#### Description
Returns a number that represents the DC needed to save against for a spell. 
For default spells cast from a spell book the DC is 10 + spell level + class spell ability bonus + spell focus feats. 
For spell-like abilities (set on a NPC creatures properties but not tied to a class) uses 10 + innate spell level + Charisma (as per D&D rules) + spell focus feats. 
For spells cast from a feat this should return 10 + class level tied to feat + primary ability modifier (eg; Arcane Archer Imbue Arrow is 10 + Arcane Archer levels + Dexterity Modifier). 
This will return 10 by default (10 + 0 + 0), even if there was no spell cast. 
This can be called by a creature via. a Spell Script or by an Area of Effect's OnEnter, OnExit or OnHeartbeat, to script saving throws for affected creatures to specific effects. If used elsewhere, it will not be a valid use of it, and will usually be totally wrong. 
#### Remarks
This does take into account all and every bonus and penalty to this value. Spell Focus, Greater Spell focus and Epic Spell Focus, as well as any other bonuses are all included at the time of calling, based on what the spell is. 
It also has -1 from each EffectNegativeLevel amount applied, which seems a bit odd, since it can get extremely negative (a level 40 caster with 35 level decreases casting a level 1 spell would have 10 + 1 + 10 (ability) - 35 = -14 total!) 
#### Known Bugs
If called from an AOE, and a lower level spell is cast after it has been created, then GetSpellSaveDC actually changes to the new value. 
#### Version
1.62 
#### See Also
functions:  |  GetReflexAdjustedDamage  MySavingThrow ReflexSave FortitudeSave WillSave GetCasterLevel GetMetaMagicFeat
