<!-- Source: https://nwnlexicon.com/index.php?title=EffectSummonCreature&amp;action=history -->

# EffectSummonCreature(string, int, float)
Creates a summon creature effect. 
effect EffectSummonCreature( string sCreatureResref, int nVisualEffectId = VFX_NONE, float fDelaySeconds = 0.0f, int nUseAppearAnimation = 0);
### Parameters 

sCreatureResref
    Identifies the creature to be summoned by resref name. Not case sensitive. 

nVisualEffectId
    A VFX_* constant referencing the visual effect to display upon summoning. (Default: VFX_NONE) 

fDelaySeconds
    There can be delay between the visual effect being played, and the creature being added to the area. (Default: 0.0f) 

nUseAppearAnimation
    Should this creature play its "appear" animation when it is summoned. Possible values:     0: just fade in somewhere near the target (Default)     1: use the appear animation     2: use appear2 (which doesn't exist for most creatures)
### Description
Returns a Summon Creature effect which will create a creature of type sCreatureResRef using the visual effect of type nVisualEffectID. 
fDelay is the delay between when the visual effect starts and the creature appears. This allows the scripter to create a much more believable effect. 
Can only be applied from creature objects (PC or NPC), no other objects. You can fire this at a specific location, because the default summoning scripts do this. It also seems to create an actual gettable effect on the caster/creator of the effect, which can be dispelled. 
This effect should not be applied instantly, only temporarily or permanently. It can be applied at a location, or a target (but it will merely use the targets location). 
### Remarks
nVisualEffectId is fired at the NEW location of the summoned creature - not the target location, say, of the spell, if the summoned creature couldn't fit there. This is very useful. Note that only an instant effect should be put here, such as VFX_FNF_SUMMON_MONSTER_1. 
You can usually only have 1 summoned monster on 1 creature at a time - any new ones (and occurrences of EffectSwarm()) will cancel out and just remove the old summoned associate as if they had been unsummoned. 
However NWN unsummoning an existing creature uses essentially a call to DestroyObject - so a workaround to this is to set existing summons to not destroyable using SetIsDestroyable for a short time while the new summoned effect is applied. This may have effects on EffectDispelMagicBest when targeting a caster (where it is possible to remove the summon by removing the effect the summon is tied to). An example is included in the utility scripts project. 
The creator of the effect (the caller of the script) will be the master - not who it is targeted on (as this is really a location effect, and should normally just be applied with ApplyEffectAtLocation()). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the caster (GetFirst/NextEffect()). See the  Effect Tutorial for more details. 
### Effect Breakdown
This creates an effect on the creature running the script, therefore summoning a monster as a placeable, door, area etc. isn't recommended. Use ExecuteScript as per the example to do it properly (or AssignCommand a whole code block). 
The effect is created with some of the properties below before being applied, but once the creature is summoned all of them should be readable. This makes it a bit easier to find it since GetEffectType returns EFFECT_TYPE_INVALIDEFFECT for it. 
The effect is not cleared on summoning a new creature if you use the SetIsDestroyable remark above which is handy, so you can loop all the effects to find out which one is tied to which summon exactly. 
If an invalid resref is passed the effect seems to create...a dummy creature with Dwarf (appearance line 0) appearance with all default min stats (1 HP, Chaotic (0) Evil (0) alignment, Barbarian (class line 0) etc.). Don't use invalid resrefs! 
The effect, if dispelled or removed with RemoveEffect, destroys the associated summon akin to DestroyObject and plays VFX_IMP_UNSUMMON (this VFX ID is hardcoded; to remove it you'd have to blank the VFX line itself). 
  * **Note:** If it can't remove the summon (eg; the creature is not destroyable ala SetIsDestroyable) the effect is removed successfully, but the summon remains, still accessible to the owner. Note plot flags won't stop the summon being destroyed (ala Black Blade of Disaster).

nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nVisualEffectId | visualeffects.2da line reference, default VFX_NONE which is -1.   
2 | nUseAppearAnimation | Appearance animation to use, default 0.   
GetEffectString  
0 | sCreatureResRef | The resref of the creature created.   
GetEffectFloat  
0 | Summon Position x | Position where the summon was intended to be created, equivalent to GetPositionFromLocation(lTarget).x where lTarget is what ApplyEffectAtLocation was passed. Note the actual location the game decides on based on pathfinding (where the VFX will appear) may well be different.   
1 | Summon Position y | Position where the summon was intended to be created, equivalent to GetPositionFromLocation(lTarget).x where lTarget is what ApplyEffectAtLocation was passed. Note the actual location the game decides on based on pathfinding (where the VFX will appear) may well be different.   
2 | Summon Position z | Position where the summon was intended to be created, equivalent to GetPositionFromLocation(lTarget).x where lTarget is what ApplyEffectAtLocation was passed. Note the actual location the game decides on based on pathfinding (where the VFX will appear) may well be different.   
3 | fDelay | Delay before the creature is created, if any. (default 0.0)   
GetEffectObject  
0 | Area Summon was Created | Equivalent to GetArea(GetLocation(lTarget)) where lTarget is where lTarget is what ApplyEffectAtLocation was passed.   
1 | Creature Summoned | The object that was summoned using this effect.   
### Version
This function was updated in 1.88.8193.36 of NWN:EE. Now GetEffectType() now has a bAllTypes parameter which includes EFFECT_TYPE_SUMMON_CREATURE. 
### Example
// The following script is for an OnUsed event. It // will summon a werewolf and add it to the PC's party. The // werewolf effect will last for 30 minutes, by executing a special// "Summon werewolf" script, "sum_werewolf", below this one.void main(){ object oPC = GetLastUsedBy(); // Execute the script ExecuteScript("sum_werewolf", oPC);}// The "sum_werewolf" script - this makes sure that the werewolf// will actually follow the PC around and act as if he is its master,// and for 30 minutes.void main(){ location lTarget = GetLocation(OBJECT_SELF); effect eSummon = EffectSummonCreature("nw_werewolf", VFX_FNF_GAS_EXPLOSION_EVIL, 0.5f); ApplyEffectAtLocation(DURATION_TYPE_TEMPORARY, eSummon, lTarget, 1800.0);}
### See Also
functions:  | SummonFamiliar
