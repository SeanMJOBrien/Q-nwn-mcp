<!-- Source: https://nwnlexicon.com/index.php/ActionCastFakeSpellAtObject -->

# ActionCastFakeSpellAtObject(int, object, int)

Display casting animation and spell visuals without subsequent spell effects. 
void ActionCastFakeSpellAtObject( int nSpell, object oTarget, int nProjectilePathType = PROJECTILE_PATH_TYPE_DEFAULT);

### Parameters 

nSpell
    The SPELL_* constant matching the spell whose casting effects will be mimicked 

oTarget
    The target object for the animation to be fake-cast at 

nProjectilePathType
    A PROJECTILE_PATH_TYPE_* constant (Default: PROJECTILE_PATH_TYPE_DEFAULT)
### Description
The Action recipient will have the appearance of casting nSpell, but there will no corresponding game effects as a result. The spell effect will be centered on or aimed at oTarget. 
If oTarget is invalid, the Action will fail. 
### Remarks
It will have the same projectile visual effects (Such as Phantasmal Killer's illusionary beast that leaps from the caster to the target) and casting visuals as the spells.2da entry, but will not fire the spell script. The caster doesn't need to know the spell. 
Also note that ActionCastFakeSpell still incurs Attacks-of-opportunity in combat, for some reason. 
### Known Bugs
For some reason stacking this Action doesn't seem to produce a predictable string of castings. The creature will cast the first FakeSpell and when reaching the next FakeSpell in its Action Queue will halt all following queued Actions. 
### Version
1.61 
### Example
// Function made by Lilac Soul to illustrate the use of// ActionCastFakeSpellAtObject - in this function, I use it// to have the NPC speaker "cast a spell" at the PC which// sets him or her at 1 experience point...void main(){ object oPC = GetPCSpeaker(); // Wave my hands and talk like I'm casting the wail of the banshee spell ActionCastFakeSpellAtObject(SPELL_WAIL_OF_THE_BANSHEE, oPC); // Apply a couple of visual effects to the PC int nDur = DURATION_TYPE_INSTANT; effect e1 = EffectVisualEffect(VFX_FNF_HOWL_MIND); effect e2 = EffectVisualEffect(VFX_FNF_PWKILL); ActionDoCommand( ApplyEffectToObject(nDur, e2, oPC)); DelayCommand(4.5, ApplyEffectToObject(nDur, e1, oPC)); // Set the PC to 1 XP - he won't be too happy with this spell! DelayCommand(4.5, SetXP(oPC, 1));}
### See Also
functions:  | ResistSpell  

constants:  | SPELL_* Constants
