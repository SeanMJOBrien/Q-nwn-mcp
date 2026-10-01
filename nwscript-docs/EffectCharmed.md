<!-- Source: https://nwnlexicon.com/index.php/EffectCharmed -->

# EffectCharmed()
Create a Charm effect. 
effect EffectCharmed();
#### Description
Returns a new effect object that raises the calling objects Personal Reputation with the target by 100 points (not the Faction Rating) when applied. 
It will also make the creature unable to command itself - instead statescripts.2da line 1, usually script nw_g0_charm, will fire. This fires a usual combat round for the creature taking into account the new "friendliness". The script appears to fire immediately after the effect is applied (and fires the creatures usual AI heartbeat too). 
Comments on the effect suggest 50 but it seems that the actual personal reputation (not faction reputation) is made to be 100 instantly with the creator of the effect. This can reflect changes in GetIsFriend for instance. It is removed if the charmer does a hostile action similar to EffectDominated, in which case the personal reputation is cleared (so their usual faction reputation resumes). 
Due to the above effects this doesn't work correctly when applied to a PC. Bioware uses GetScaledEffect to replace it with EffectDazed instead. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
There are some benefits to using spells that cause this in Bioware modules - usually price adjustments on merchants will be at maximum. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
This is a complex state effect CREATURE_STATE_CHARMED (value 1). It is solely used with this function, and should be applied when the effect creator is a creature, against another creature - noting the oddities if it is used on a PC from an NPC (Bioware usually replaces it with EffectDazed, see GetScaledEffect). 
When a creature is charmed these effects take place: 
  * The current actions of the creature are cleared ala ClearAllActions
  * The creature is made uncommandable ala SetCommandable
  * The personal reputation is adjusted 100 to positive against the effect creator 
    * This seems to work fine for NPCs (when dominated by a PC or NPC) but is odd if applied to PCs by an NPC. PC's do get all the other effects but will also not see the enemies change to "friends". This can be worked around with a custom state script however (eg; finding who applied the effect, and ignoring that faction for who to attack).
    * Not tested: PCs applying it to other PCs. It likely has the same "non-effect" to reputation but will still get the other effects.
  * statescript.2da line 1 is fired immediately (resetting the heartbeat timings on the creature it seems), usually nw_g0_charm, which will set them to commandable, do a combat round, and set them to not commandable. 
    * Note the creatures AI heartbeat file is _also_ fired, but since they are uncommandable it usually just exits.

Since they are now friendly the creature, while they won't follow you, will fight with you against enemies - of course, only enemies they previously hated anyway. So if you have 2 hostile creatures in the same faction fighting you, and you charm one, they won't go and attack the other (unlike EffectDominated). 
In the case of a hostile creature you charm, if you, or a fellow faction member, attack the creature you charmed or a creature nearby who is part of their faction, it seems to remove the charm (if of temporary duration, see below) and makes them angry again. 
The charm effect amusingly is not removed if it is permanent - this means a commoner or other "passive" creature will now proceed to attack you (no default spells however do a permanent effect!). Need to still test out the faction reputation stuff when charms are in place and they're broken. 
The removal cases, spells, attacks, and so forth need fully documenting. It's a bit of a minefield. Given it uses personal reputation only, it's a bit of a mess especially mid-combat and given the usual faction reputation changes the game does when attacking creatures. 
Once removed (by running out or aforementioned attacking) it removes the temporary boost and goes back to faction defaults. It won't clear any actions however (so a PC mid way ActionAttack under this effect simply carries on). If they were hostile, they'll be hostile again but the AI, due to no new events firing for it, might stand around doing nothing (until you trigger OnPerception or similar). If they were friendly they'll be friendly again. 
Creatures are immune to this effect if they have IMMUNITY_TYPE_CHARM or IMMUNITY_TYPE_MIND_SPELLS, or they have a valid master creature (GetMaster is valid) who is also a PC (ie a PC's henchmen or summons will not be affected). It will also not affect dead, plot or immortal characters. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 1, CREATURE_STATE_CHARMED |   
#### Version
1.62 
#### Example
// Sample code for applying a charm effect to a target.// For this, you cannot use OBJECT_SELF of course main(){ // This is the Object to apply the effect to. object oTarget = GetPCSpeaker(); // Create the effect to apply effect eCharm = EffectCharmed(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_CHARM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eCharm, oTarget);}
#### See Also
functions:  |   EffectLinkEffects
