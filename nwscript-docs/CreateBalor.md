<!-- Source: https://nwnlexicon.com/index.php/CreateBalor -->

# CreateBalor

# CreateBalor()
Summons a Balor to fight for the caster 
void CreateBalor();
#### Description
This function Summons a Hostile Balor to fight. Although it is found in the nw_s0_gate.nss spell file, it is the creation of a balor when the caster is not protected from it. The summoned balor is done using EffectSummonCreature(), as normal. It is always good to use this to summon an evil demon to slay those pesky paladins... 
#### Remarks
Found in; nw_s0_gate.nss Because it already has a void main() in the spell file, you need to copy/paste the code to use this function. 
#### Requirements
#include " nw_s0_gate " 
#### Version
1.62 
#### Example
// The function from nw_s0_gate.nss.// Creates the hostile (thus called "_EVIL", although balors// are always evil anyway...sigh) balor to fight the caster, who// stupidly called it when unprotected.void CreateBalor(){ CreateObject(OBJECT_TYPE_CREATURE, "NW_S_BALOR_EVIL", GetSpellTargetLocation());}// Note: to summon a "nice" version (Which still checks for the// correct spells such as Protection from Evil), use this line:eSummon = EffectSummonCreature("NW_S_BALOR", VFX_FNF_SUMMON_GATE, 3.0);
#### See Also  
---
