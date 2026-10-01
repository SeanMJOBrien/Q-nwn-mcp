<!-- Source: https://nwnlexicon.com/index.php/GetAreaOfEffectCreator -->

# GetAreaOfEffectCreator(object)
Gets the creator of an Area of Effect object. 
object GetAreaOfEffectCreator( object oAreaOfEffectObject = OBJECT_SELF);
#### Parameters 

oAreaOfEffectObject
    The Area of effect object you wish to examine. (Default: OBJECT_SELF)
#### Description
Returns the creator of oAreaOfEffectObject. 
Returns OBJECT_INVALID if oAreaOfEffectObject is not a valid Area of Effect object. 
It can return OBJECT_INVALID if the creator is invalid or destroyed. Usually the latter but the former can happen if a player logs out. 
If this happens for a area of effect script, almost all ResistSpell() function calls, and Will/Fort/ReflexSave functions will not work properly (as they require creatures to be input). For this reason, Bioware recently (1.59+) have added a destroy call to the start of area-of-effect scripts, to destroy them if the creator is invalid. 
#### Remarks
Area of Effects are often scripted spells with numerous effects tied to them. This function is best called within the scripts that define an Area of Effect impacts such as OnEnter, OnExit and OnHeartbeat. 
Effects created by an Area of Effect by default will be tied to the Area of Effect creator. Tagging effects is also an effective way to identify them in the OnExit. 
Area of Effects can be mobile, or static. If mobile there is an effect on the person the AOE is following that functions like GetEffectCreator and so forth can be called on 
#### See Also
functions:  |  GetEffectCreator
