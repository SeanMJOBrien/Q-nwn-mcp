<!-- Source: https://nwnlexicon.com/index.php/ResistSpell -->

# ResistSpell(object, object)
Performs a spell resistance check between the caster and the target. 
int ResistSpell( object oCaster, object oTarget);
#### Parameters 

oCaster
    Caster of the spell. 

oTarget
    Target of the spell.
#### Description
Checks for spell resistance, spell absorpsion and spell immunities between oCaster and oTarget. Takes into account the current spell ID, spell school and spell level, the caster's caster level, and the targets effects and spell resistance. 
It has different return values based on what was passed in: 
  * Return value if oCaster or oTarget is an invalid object or it is not resisted: FALSE
  * Return value if spell cast is not a player spell: - 1
  * Return value if spell resisted: 1
  * Return value if spell resisted via magic immunity: 2
  * Return value if spell resisted via spell absorption: 3

Bioware uses MyResistSpell for spells that use this, to apply appropriate visual effects for the return value. It is a good idea to use this wrapper function instead of this directly. The Bioware function only returns 1 or 0. 
In the case of area of effect scripts you should always pass in GetAreaOfEffectCreator. If they are invalid the AOE should be destroyed. 
#### Remarks
This function checks spell resistance, globes, and spell immunity (i.e., the effects EffectSpellImmunity, EffectSpellResistanceIncrease, EffectSpellLevelAbsorption or appropriate item properties) if the spell cast is a PC spell as defined in spells.2da. See separate descriptions for exact effects. 
The order of checks given multiple effects appears to be this order with these messages. The UserType column reflects entries in spells.2da. UserType values are: 
  * 1 - Spells, and spell-like abilities, which have caster levels
  * 2 - Abilities, like Dragons Breath. They don't have a "caster level" inherently.
  * 3 - Feats, like Harper's Sleep feat.
  * 4 - Items and "other" - like Activate Item or "Ale" spells.

Note that some act differently if cheat-cast using ActionCastSpellAtObject versus ActionUseFeat, for instance Harper Sleep will react properly if cheat-cast but not as a feat-use. 
Order  | Return Value  | Applies To UserType  | Effect Tested  | Feedback Message(s)   
---|---|---|---|---  
1 | 3 | 1 only | EffectSpellLevelAbsorption, ItemPropertySpellImmunitySchool and ItemPropertyImmunityToSpellLevel. It goes on the basis of the highest nMaxSpellLevelAbsorbed, first of all for those with limited absorption, then unlimited (although any unlimited one matching the spell level will do). This is why spell mantles get used up before Globe of Invulnerability is even tested. If nTotalSpellLevelsAbsorbed is 0, then it sends message (1) else it will display messages listed as (2).  | (1) (TARGET) attempts to resist spell : magic immunity (2) (TARGET) Spell Level Absorption absorbs (X) spell level(s). : (Y) spell level(s) remaining (2) (TARGET) attempts to resist spell : spell absorbed   
2 | 2 | 1, 2 or 4 3 if used via. ActionCastSpell only (if used by ActionUseFeat it doesn't test this!)  | EffectSpellImmunity for all spells, or the specific spell (ie; GetSpellId), eg: Shield which protects against Magic Missile. This also covers ItemPropertySpellImmunitySpecific.  | (TARGET) : Immune to (SPELL NAME) (TARGET) attempts to resist spell : magic immunity   
3 | 1 | 1 3 if used via. ActionCastSpell only (if used by ActionUseFeat it doesn't test this!)  | EffectSpellResistanceIncrease, ItemPropertyBonusSpellResistance or monks inherent spell resistance. There is no feedback on the roll oddly.  | If SR check is successful: (TARGET) attempts to resist spell : spell resisted If SR check is unsuccessful: (TARGET) attempts to resist spell : failure   
4 | 0 | 1 or 3 only | Not immune or resisted - or at least no resistance check passed.  | No feedback messages unless SR was attempted and failed.   
5 | -1 | 2 or 4 only | Not immune to spell, and isn't a usual spell, so -1.  | No feedback messages   
This function should never be used except in a spell script or AOE script. It may not work correctly elsewhere, as mantles and globes use the spell's level to stop the spell or decrease the amount of a given spell mantle's power (as well as the caster level of oCaster, used for Spell Resistance checks). 
#### Known Bugs
Several "feat"-spells are hostile, such as Harper Scouts "Sleep" spell (line 480 in spells.2da). The issue is that, as per above, UserType 3 ignores any checks when used as an actual feat. It ignores everything other than the EffectSpellImmunity if cast as a spell too. 
It could be considered a bug that the function tests the things in the way it does, instead of an order that prefers the defender - so using spell mantles last, after immunities and SR. Although changing this would be a big gameplay change. 
#### Version
This function was updated in 1.83.8193.21 of NWN:EE. Game: Fixed ResistSpell() when called from AOE spell scripts. AOE spells were fixed to properly store the spell level for the purposes of spell mantles and save DC, so Grease cast first then Wail of the Banshee cast second doesn't make Grease suddenly a level 9 spell with the increased DC of it. It also fixed multiple caster classes inheriting caster levels for ResistSpell so a Druid 1/Wizard 39 won't bypass spell resistance if they cast Grease from the Druid then anything from the Wizard (although GetCasterLevel as of this patch is still bugged on AOEs). 
#### See Also
functions:  |   MyResistSpell  GetCasterLevel GetSpellResistance
