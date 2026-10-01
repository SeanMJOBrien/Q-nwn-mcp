<!-- Source: https://nwnlexicon.com/index.php/GetSpellId -->

# GetSpellId()
Determines the spell identifier for a spell which a script is currently processing. 
int GetSpellId();
#### Description
This is for use in a Spell Script, it gets the ID (SPELL_*) of the spell that is being cast. 
If used in an Area of Effect script (OnEnter, OnExit, OnHeartbeat) it will return the ID of the spell that generated the AOE effect. 
Returns -1 if no spell was cast or on error. 
The spell ID returned is what spell ID is applied to effects in the current script run. 
#### Remarks
Multiple spells share the same script that is used to resolve the effect of the spell for code reuse but the scrip is altered slightly by the specific spell that it is working processing. For example the Polymorph Self script (script name nw_s0_polyself) is called by different spells determined by what monster they are polymorphing into. 
Strictly used in scripts that resolve a spells or spell abilities effects, this function is used to check for what line in spells.2da called the given script. "Feat" spells, as run from feat.2da, also have a spells.2da line and the "spell ID" can help identify these. See also GetSpellFeatId. 
On a side note to change the scripting of a spell one could modify the BioWare scripts for a spell or spell ability (eg. NW_S0_FLMSTRIKE for Flame Strike) and save that script within the module (or Hakpak). 
This should only be used inside spell scripts. If you want to learn how to use the new spellhooking system, check the advanced scripting tutorials in the Lexicon's Lyceum. 
Custom spells and spell-effects can be added; see spells.2da and spells and abilities pages. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Area of Effect objects now consistently store and retrieve their caster level (GetCasterLevel) and spell ID (GetSpellId). 
#### Example
//:://///////////////////////////////////////////////:: Polymorph Self//:: NW_S0_PolySelf.nss//:: Copyright (c) 2001 Bioware Corp.//::///////////////////////////////////////////////* The PC is able to changed their form to one of several forms.*///::////////////////////////////////////////////////:: Created By: Preston Watamaniuk//:: Created On: Jan 21, 2002//:://////////////////////////////////////////////void main(){ //Declare major variables int nSpell = GetSpellId(); object oTarget = GetSpellTargetObject(); effect eVis = EffectVisualEffect(VFX_IMP_POLYMORPH); effect ePoly; int nPoly; int nMetaMagic = GetMetaMagicFeat(); int nDuration = GetCasterLevel(OBJECT_SELF); //Enter Metamagic conditions if (nMetaMagic == METAMAGIC_EXTEND) { nDuration = nDuration *2; //Duration is +100% } //Determine Polymorph subradial type if(nSpell == 387) { nPoly = POLYMORPH_TYPE_GIANT_SPIDER; } else if (nSpell == 388) { nPoly = POLYMORPH_TYPE_TROLL; } else if (nSpell == 389) { nPoly = POLYMORPH_TYPE_UMBER_HULK; } else if (nSpell == 390) { nPoly = POLYMORPH_TYPE_PIXIE; } else if (nSpell == 391) { nPoly = POLYMORPH_TYPE_ZOMBIE; } ePoly = EffectPolymorph(nPoly); //Fire cast spell at event for the specified target SignalEvent(oTarget, EventSpellCastAt(OBJECT_SELF, SPELL_POLYMORPH_SELF, FALSE)); //Apply the VFX impact and effects ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, ePoly, oTarget, TurnsToSeconds(nDuration));}
#### See Also
functions:  |  GetSpellFeatId GetLastSpell GetCasterLevel  

constants:  |   SPELL_* Constants  "Spell \(constant group\)")  
events:  |  Spell Script
