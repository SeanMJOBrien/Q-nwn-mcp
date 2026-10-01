<!-- Source: https://nwnlexicon.com/index.php/EffectSwarm -->

# EffectSwarm(int, string, string, string, string)
Returns a Swarm effect. 
effect EffectSwarm( int nLooping, string sCreatureTemplate1, string sCreatureTemplate2 = "", string sCreatureTemplate3 = "", string sCreatureTemplate4 = "");
#### Parameters 

nLooping
    If this is TRUE, for the duration of the effect when one creature created by this effect dies, the next one in the list will be created. If the last creature in the list dies, we loop back to the beginning and sCreatureTemplate1 will be created, and so on... 

sCreatureTemplate1
    Blueprint of first creature to spawn 

sCreatureTemplate2
    Optional blueprint for second creature to spawn (Default: "") 

sCreatureTemplate3
    Optional blueprint for third creature to spawn (Default: "") 

sCreatureTemplate4
    Optional blueprint for fourth creature to spawn (Default: "")
#### Description
Returns a Swarm effect of, up to, four definable creatures. 
This is exactly the same as EffectSummonCreature() except, after one dies, another takes its place. See EffectSummonCreature() for some more information on the subject of summoned monsters. 
This effect can be applied Temporarily or Permanently. 
#### Remarks
This effect does not work with ApplyEffectAtLocation(). 
When applied to a PC, the spawned creature will become part of the target PC's group, replacing any summon creature the PC might already control. 
Bioware's description of what nLooping does is a little vague. The effect will actually proceed to the next creature when the one before dies even when nLooping is FALSE. Once the last creature in the list dies, though, if nLooping is FALSE, the effect ends even if its duration hasn't expired yet. If nLooping is TRUE, however, the effect loops back and starts over with the first creature. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
The effect will fire visualeffects.2da row 35 - VFX_FNF_SUMMON_MONSTER_3 - on spawning a new summon. This cannot be changed. 
This is a slightly more complicated EffectSummonCreature. If you're trying to get more than one summoned creature at once it's probably not worth using this, insofar as you don't know when the new creature will appear since there may be variable time between the OnDeath of one creature an the appearance of the next. 
Interestingly in comparison to EffectSummonCreature it does something about invalid templates instead of spawning a dwarf. If there is at least 1 valid template it'll use that (repeatedly if necessary as per the description) and remove any invalid ones as they are reached, altering the parameters. If for instance the last resref is bad, it'll do spawns 1, 2 and 3 fine then loop back to 1 again if nLooping is on. It also updates the "Number of templates" value to be correct. 
Having an invalid template in sCreatureTemplate1 slot but at least one other valid slot will mean it bugs out and nothing is really spawned but the effect shows a VFX still. Bit odd but at least no dwarfs! 
Having 4 invalid templates deletes the effect. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nLooping |   
1 | 0-Index of template currently spawned | This cycles 0, 1, 2 and 3 as it goes through each template (sCreatureTemplate1 being spawned therefore equates to value 0). So if we have sCreatureTemplate3 currently spawned it will be value 2. If there are only 2 templates for instance it'd only cycle values 0 and 1.   
2 | Number of templates | Set to 1, 2, 3 or 4 depending on how many sCreatureTemplate's are filled in. It doesn't check them all at the start of the effect - it instead sets it to 4 and will decrease it if it detects less once it reaches the point of respawning the first creature. To check if there are other valid resrefs check the strings below for content.   
GetEffectString  
0 | sCreatureTemplate1 |   
1 | sCreatureTemplate2 |   
2 | sCreatureTemplate3 |   
3 | sCreatureTemplate4 |   
GetEffectObject  
0 | Creature Object Spawned | This is the current creature this effect has spawned.   
#### Version
1.62 
#### Example
// Example 1 - The following script is an OnUsed event script.// When triggered, it checks to make sure it was triggered by a// PC, and if not exits the script. If it was a PC that triggered the// script, the Swarm effect is created and applied to the PC for// duration of 3 minutes.void main(){ effect eSwarm; object oPC = GetLastUsedBy(); if ((oPC)) return; eSwarm = EffectSwarm(TRUE, "nw_skeleton", "nw_skelchief", "nw_skeleton", "nw_skeleton"); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eSwarm, oPC, 180.0f);}
#### See Also
functions:  |   SummonFamiliar
