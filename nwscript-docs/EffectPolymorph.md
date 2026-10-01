<!-- Source: https://nwnlexicon.com/index.php?title=EffectPolymorph&amp;action=history -->

# EffectPolymorph(int, int)
Create a Polymorph effect that changes the target into a different type of creature. 
effect EffectPolymorph( int nPolymorphSelection, int nLocked = FALSE, int nUnpolymorphVFX = VFX_IMP_POLYMORPH, int nSpellAbilityModifier = -1, int nSpellAbilityCasterLevel = 0);
### Parameters 

nPolymorphSelection
    A POLYMORPH_TYPE_* constant matching the form to polymorph into (line from polymorph.2da) 

nLocked
    If TRUE, player can't cancel polymorph (Default: FALSE) 

nUnpolymorphVFX
    If -1 no VFX will play when this polymorph is removed. Else will play the relevant VFX. (Default: VFX_IMP_POLYMORPH) 

nSpellAbilityModifier
    Set a custom spell ability modifier for the 3 polymorph spells. Save DC is 10 + Innate spell level + this ability modifier. -1 uses the creators spellcasting/feat using class spellcasting ability modifier. (Default: -1) 

nSpellAbilityCasterLevel
    Set a custom caster level for the 3 polymorph spells. Default (0) is to use the first class slot class level as previously. (Default: 0)
### Description
Returns a new effect object that, when applied to a target, will transform them into one of the types defined in the POLYMORPH_TYPE_*") constant group, from the polymorph.2da file. New forms can be added via a new 2da in a hakpack. 
A new polymorph will cancel out an existing one. If nLocked is TRUE, there is no "Cancel Polymorph" in the radial menu, so it cannot be removed manually by a PC; the effect can only be removed when the duration runs out or (if applied via a spell and is magical) it is dispelled, or via. RemoveEffect. 
The target this effect is applied to must be a creature for it to work. 
### Remarks
There may be polymorph types that can be used but which don't have a constant associated with it. All the different POLYMORPH_TYPE_*") constants are just integers referencing a row number in your polymorph.2da file. Look in this file to see if there are further polymorphs available for you. 
Polymorph changes these aspects of a creature: 
  * Removes all equipped items temporarily
  * Their appearance (and with it, creature speed, creature size, and associated bonuses/penalties).
  * Their racial type (GetRacialType() return value also changes, PC's can be affected by things like Turn Undead if they're undead and their base statistics)
  * Their portrait
  * Their soundset (fixed in 1.89.8193.37)
  * Their equipped primary hand weapon (if valid weapon) (note that they don't need proficiency feats for this, it just magically appears in their hands).
  * Their creature weapons (if valid, else they are considered unarmed) (they also get the feat FEAT_CREATURE_WEAPON_PROFICIENCY to use creature weapons properly).
  * Their hide item (which provides most permanent special bonuses)
  * They may gain Natural base AC (previous to 1.89.8193.37 this was bonus dodge AC). This natural AC is always usable even when knocked down etc.
  * They gain a bonus to their hit points (acts like temporary hit points and cannot be healed)
  * Their Strength, Dexterity, Constitution (if valid values, else will use the original creatures original statistics. It may even lower statistics if their natural statistic is higher then what the new one is)
  * They may gain up to 3 spells/natural abilities to cast infinitely (unless restricted in the script that runs)
  * They cannot cast spells or use items apart from potions

All the ones without a comment after should always be present when a polymorph is done. Some are not present (IE: **** in the 2da file) and thus it is just ignored (so no weapon, means no weapon is equipped, and no bonus to dexterity means they use their natural dexterity). 
Effect functions are constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be gotten separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
### Effect Breakdown
The actual functionality of polymorph is completely crazy in a mad scentist kind of way. You do literally have most of your base statistics replaced. See polymorph.2da for some more information on what is setup in the 2da file. 
Some specific details (compared to the general list above) and caveats of the effect are: 
  * You have any existing EFFECT_POLYMORPH effects removed at the time of application
  * Internal effects applied: 
    * EffectTemporaryHitpoints("HPBONUS") effect, for the temporary hit points but done internally. This is removed when the polymorph is cancelled, but it running out doesn't cancel it. This is hidden from GetFirst/NextEffect. An effect icon does appear for this.
    * EffectACIncrease("NATURALACBONUS", AC_DODGE_BONUS) is applied. Yes it's dodge. This is presumably so it can go higher than usual limitations. No effect icon appears for this.
  * When the game is saved or characters are exported, the effect is temporarily removed. When effects are tied to it, such as with EffectLinkEffects, these get removed (example: Tensers Transformation has this issue). 
    * This also removes any shifter-based "merged item bonuses" to creature items
    * You can test this very simply by using the Export Character function in the main menu in singleplayer. The VFX for removing polymorph also occurs.
    * This is all to fix the even worse bug of "character saved to file is now the polymorph creature" which breaks ELC and other things.

The character sheet of the PC is updated with most of the new statistics, but not all of them in case you wondered why some don't appear. Creature weapons appear oddly - it shows all 3 options of attacks, even though of course only one will be randomly chosen. 
There are obvious issues in some areas when polymorphing to a large or giant creature (eg fitting through doors) - but a PC can just usually unpolymorph to get around this. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPolymorphSelection | Can be 0 which is a valid polymorph.2da line   
1 | Special | Used for internal tracking of the polymorph effect and irrelevant outside of the engine.   
2 | nLocked | If the polymorph is locked.   
3 | Custom VFX? | If 1 then effect integer 4 is the Unpolymorph VFX to use. This is because a valid VFX ID is 0.   
4 | nUnpolymorphVFX | The VFX to play when the polymorph is removed, -1 means no VFX is played.   
5 | Ability Modifier in use | If set then value 6 is used for the ability modifier. Used because 0 is a valid amount of ability modifier to have.   
6 | nSpellAbilityModifier | The amount of ability modifier (positive or negative, or 0) that apply to the 3 spells.   
7 | nSpellAbilityCasterLevel | The caster level of the 3 spells. 0 will calculate using the first class slot.   
### Known Bugs
The relevant bugs previously (losing spell slots, issues with ability scores when levelling up) should be now fixed as per the changes under Version below. Notably you cannot level up when polymorphed anymore. 
### Version
This function was updated in 1.89.8193.37 of NWN:EE. 
  * VM: EffectPolymorph() can now have a customised polymorph removal VFX and can set an ability modifier and caster level for the 3 polymorph spells cast from it. 
    * Polymorph: The save DC for the 3 polymorph spell-like abilities is now set to 10 + Innate Spell Level + Ability Modifier (the ability to use is set in EffectPolymorph or defaulting to the class who used the polymorph ability/spell, falling back to class slot 0 if necessary).
    * Polymorph: The caster level of the 3 polymorph spell-like abilities is tied to the caster level of the polymorph effect by default, rather than being based on class slot 0 of the character.
    * Polymorph: Clientside Levelups are disabled while polymorphed, and serverside now correctly validates against pre-polymorph racial type and statistics in case of legacy clients (although with certain custom content this fallback may still be buggy).
    * Polymorph: bonus spell slots should no longer be lost or unreadied while polymorphed.
    * Polymorph: Dying while polymorphed now properly applies pre-polymorphed item effects such as ability bonuses.
    * Polymorph: Save games no longer re-apply temporary HP on each load of the game/re-entry into MP server.
    * Polymorph: Save games now save out the state of the creatures pre-polymorph making valid BICs in save game files.
    * Polymorph: Creature weapon proficiency is applied as a bonus feat effect not as an actual feat addition.
    * Polymorph: Polymorph applied items are saved to the BIC consistently on logout/save game and reused when polymorph is applied on load/login rather than fresh items being applied.
    * Polymorph: Loading a save game when polymorphed no longer causes extra OnPlayerEquipItem/OnPlayerUnequipItem events to fire (note: logging into an MP game still has odd events fire, excepting the OnPlayerUnEquip no longer fires for the players items when the polymorph effect loads, due to the order of BIC -> temporary user resource data).
    * Polymorph: The effect is no longer is removed and reapplied on BIC export meaning linked effects do not end and events for item equips do not fire unnecessarily on saving the game or exporting player BIC.
    * Polymorph: NATURALACBONUS is now actually a base natural AC change rather than a dodge AC effect, replacing NPCs base natural AC if present when polymorphed (PCs do not get any base natural AC so this is a slight buff).
    * Polymorph: Fixed bonus spell slots being lost when using Shifter polymorph abilities.
    * Fixed loading SoundSet column in polymorph.2da.

### Example
// Sample code for applying a werewolf polymorph to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect ePoly = EffectPolymorph(POLYMORPH_TYPE_WEREWOLF); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_POLYMORPH); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, ePoly, oTarget);}
### See Also
functions:  | SetCreatureAppearanceType  

constants:  | POLYMORPH_TYPE_* Constants
