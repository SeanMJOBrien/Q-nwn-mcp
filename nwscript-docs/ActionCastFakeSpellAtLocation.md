<!-- Source: https://nwnlexicon.com/index.php/ActionCastFakeSpellAtLocation -->

# ActionCastFakeSpellAtLocation(int, location, int)

Display casting animation and spell visuals without subsequent spell effects. 
void ActionCastFakeSpellAtLocation( int nSpell, location lTarget, int nProjectilePathType = PROJECTILE_PATH_TYPE_DEFAULT);

### Parameters 

nSpell
    The SPELL_* constant matching the spell whose casting effects will be mimicked 

lTarget
    The location at which to cast the fake spell 

nProjectilePathType
    A PROJECTILE_PATH_TYPE_* constant (Default: PROJECTILE_PATH_TYPE_DEFAULT)
### Description
The Action recipient will have the appearance of casting nSpell, but there will no corresponding game effects as a result. The spell effect will be centered on or aimed at lTarget. 
### Remarks
It will have the same projectile visual effects (Such as Phantasmal Killer's illusionary beast that leaps from the caster to the target) and casting visuals as the spells.2da entry, but will not fire the spell script. The caster doesn't need to know the spell. 
Also note that ActionCastFakeSpell still incurs Attacks-of-opportunity in combat, for some reason. 
### Known Bugs
For some reason stacking this Action doesn't seem to produce a predictable string of castings. The creature will cast the first FakeSpell and when reaching the next FakeSpell in its Action Queue will halt all following queued Actions. 
### Version
1.22 
### Example
// Function made by Lilac Soul to illustrate the use of// ActionCastFakeSpellAtLocation. In this function, I use it// to have the NPC speaker "cast a spell" which just misses// the PC and fizzles - I guess the NPC is inept at magic main(){ object oTarget = GetPCSpeaker(); // The PC's current location location lLoc = GetLocation(oTarget); // Generate a location near to the PC vector vPos = GetPositionFromLocation(lLoc); vPos.x += IntToFloat(d6()); vPos.y += IntToFloat(d6()); lLoc = Location(GetArea(oTarget), vPos, GetFacing(oTarget)); // Cast the spell at this new location ActionCastFakeSpellAtLocation(SPELL_GATE, lLoc); // Apply the fizzle effect at this new location DelayCommand(2.0, ApplyEffectAtLocation(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_FNF_DISPEL_GREATER), lLoc));}
### See Also
functions:  | ActionCastSpellAtLocation  

constants:  | SPELL_* Constants
