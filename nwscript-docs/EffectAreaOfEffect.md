<!-- Source: https://nwnlexicon.com/index.php?title=EffectAreaOfEffect&amp;action=history -->

# EffectAreaOfEffect(int, string, string, string)
Returns a new Area of Effect effect. 
effect EffectAreaOfEffect( int nAreaEffectId, string sOnEnterScript = "", string sHeartbeatScript = "", string sOnExitScript = "");
#### Parameters 

nAreaEffectId
    The ID of the Area of Effect; a reference to vfx_persistent.2da - usually a AOE_MOB_* when applied to creatures or AOE_PER_* when applied at a location. 

sOnEnterScript
    The script to use when a creature enters the area of the Area of Effect. If not set it uses the value from vfx_persistent.2da (Default: "") 

sHeartbeatScript
    The script to run on each of the Area of Effect's Heartbeats. If not set it will use the value from vfx_persistent.2da (Default: "") 

sOnExitScript
    The script to run when a creature leaves the area of an Area of Effect. If not set it uses the value from vfx_persistent.2da (Default: "")
#### Description
Create an Area Of Effect effect either on a creature which moves with it (AOE_MOB_* "mobile" values) or at a location where it will stay still (AOE_PER_* "persistent" values). 
If the scripts are not specified, default ones will be used. 
The target you can apply this to can be any valid (non static) object that ApplyEffectToObject works on, or a location. 
This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Usually you edit in your own scripts into vfx_persistent.2da. However if you want to blank a script using the parameters use a invalid script name such as "default". 
In the OnEnter, OnExit and OnHeartbeat scripts you use GetAreaOfEffectCreator returns the caller of the script that the effect is applied from. 
This effect becomes an object after applied to creature or location and can be retrieved by a GetObjectByTag or GetFirstObjectInShape functions. The tag of the AOE object is the value of the column "LABEL" for a given AOE, defined in the vfx_persistent.2da file. These objects have no name and have no resref. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
There is further information on Area of Effects on the nwn.wiki. 
If an Area of Effect is created by an Area (using an Area's script or AssignCommand) the GetAreaOfEffectCreator will be OBJECT_INVALID which means most spellcasting related functions won't function correctly. Effects applied from it also have no GetEffectCreator set. 
##### Applied to Creatures
If applied to a creature then the effect will apply to the creature as something you can find, and as an object that follows the creature around. This means it can be correctly dispelled. The effect if removed will remove the corresponding Area of Effect object. 
Note that only circle-type area of effects should be applied to creatures - square ones seem to be a Bad Idea(TM) to use. 
Since the OnEnter and OnExit of area of effects only apply to creatures (likely for optimisation purposes) checking for non-creatures in a mobiles AOE effect area is probably counterproductive. 
Note you can "escape" the AOE applied to yourself if you move fast enough and also have some hiccup in the game (pausing or losing game focus) while moving fast. This is a _lot_ less likely in NWN:EE but is still weirdly possible. 
##### Applied to Locations
If applied to a location then the AOE object is created but no corresponding effect is applied to the caster to dispel it. Instead area dispel magic can check for the object type in the given target area. 
This object is static and basically just stays put doing it's thing. It can be either rectangular or circular. 
#### Area of Effect Object
This object has all the normal parameters of an object; it can be destroyed by DestroyObject to "dispel" it or remove it from the game. 
You also get a User Defined Event according to SetEventScript usable constants - although you need to use that function to make use of it. 
Due to the lack of GetEffect* functions being able to work on the object, you cannot retrieve information such as the remaining duration or the type (such as supernatural, or magical). This means at-location AOE's have less information available to scripters unless manually set. 
To get this object in the script that creates it, you should use GetNearestObjectByTag or similar to find it, using the LABEL column to identify it. 
The Area of Effect object can now use an array of additional functions to retrieve information set when the object was created, in particular: 
  * GetAreaOfEffectCreator is the creator of the AOE object and where effects will originate from (can be overridden with SetEffectCreator)
  * GetCasterLevel on the object will return the stored caster level (can be overridden with SetEffectCasterLevel)
  * GetSpellId correctly returns the spell ID used to generate it (can be overridden with SetEffectSpellId)
  * GetSpellSaveDC is stored properly from the originating script call
  * GetMetaMagicFeat is stored from the originating script
  * GetLastSpellCastClass is stored from the originating script

Some things like GetLastSpellLevel, GetSpellFeatId and GetSpellCastSpontaneously won't be carried over however. 
#### Area of Effect Effect
If applied to creatures you can gather some more information from the effect that is applied. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAreaEffectId | The vfx_persistent.2da line this effect is related to   
GetEffectString  
0 | sOnEnterScript | sOnEnterScript parameter. If blank it will use the value from vfx_persistent.2da.   
1 | sHeartbeatScript | sOnEnterScript parameter. If blank it will use the value from vfx_persistent.2da.   
2 | sOnExitScript | sOnExitScript parameter. If blank it will use the value from vfx_persistent.2da.   
GetEffectObject  
0 | AOE created | This is the AOE object created when the effect was applied to this creature.   
#### Known Bugs
While NWN:EE improved mobile (attached to creature) AOE's which now should move correctly with the creature they are attached to, you can still escape them if the AOE lags for any reason - it seems to occur when the game loses focus and for smaller AOE's. To work around this in the OnExit of an AOE make sure to never strip EFFECT_TYPE_AREA_OF_EFFECT from an exiting object. It'll fire OnExit then OnEnter events in quick succession since it'll rapidly "catch up". 
#### Version
This function was updated in 1.83.8193.21 of NWN:EE. Game: Fixed ResistSpell() when called from AOE spell scripts. 
This function was updated in 1.84.8193.29 of NWN:EE. EffectAreaOfEffect: Fixed Area Of Effect sometimes not returning the expected objects due to local object positions in memory not updating correctly. #52
This function was updated in 1.88.8193.36 of NWN:EE. Area of Effect objects now consistently store and retrieve their caster level (GetCasterLevel) and spell ID (GetSpellId). 
#### Example
int AOE_BOG_STINK = 1500;void main(){ //Declare the Area Of Effect, assign it an ID, and tell it what scripts to run when someone interacts with it. effect eAOE = EffectAreaOfEffect(AOE_BOG_STINK, "bog_on_enter", "bog_on_hb", "bog_on_exit"); location lTarget = GetLocation(GetEnteringObject()); int nDuration = 2; //Create an instance of the AOE Object using the Apply Effect function ApplyEffectAtLocation(DURATION_TYPE_TEMPORARY, eAOE, lTarget, RoundsToSeconds(nDuration));}
#### See Also
functions:  |  ApplyEffectAtLocation
