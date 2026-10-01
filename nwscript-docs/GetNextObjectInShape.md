<!-- Source: https://nwnlexicon.com/index.php/GetNextObjectInShape -->

# GetNextObjectInShape(int, float, location, int, int, vector)
Determines the next object of a specific type (creature, door etc) in shape. 
object GetNextObjectInShape( int nShape, float fSize, location lTarget, int bLineOfSight = FALSE, OBJECT_TYPE_CREATURE, vector vOrigin = [0.0,0.0,0.0]);
#### Parameters 

nShape
     SHAPE_*  

fSize
    The size of the shape (Look at description for more information). 

lTarget
    The starting location of the shape. 

bLineOfSight
    This controls whether to do a line-of-sight check on the object returned. (This can be used to ensure that spell effects do not go through walls.) (Default: FALSE) 

nObjectFilter
     OBJECT_TYPE_CREATURE  

vOrigin
    This is only used for cylinders and cones, and specifies the origin of the effect (normally the spell-caster's position). (Default: [0.0,0.0,0.0])
#### Description
Returns the next object that is within the specified nShape and fSize and OBJECT_INVALID if no more objects contained. 
**IMPORTANT NOTE:** Do not apply EffectDamage without a DelayCommand (do DelayCommand(0.0, Apply...) at minimum). If you do fire it the OnDamaged or OnDeath OnPlayerDeath script may fire, causing this loop to reset and start from scratch when you call GetNextObjectInShape (since those scripts may call their own GetFirstObjectInShape). 
The meaning of fSize depends on nShape: 
  * If nShape == SHAPE_SPHERE, fSize is the radius of the sphere.
  * If nShape == SHAPE_SPELLCYLINDER, fSize is the length of the cylinder. Spell Cylinder's always have a radius of 1.5m.
  * If nShape == SHAPE_CONE, fSize is the widest radius of the cone
  * If nShape == SHAPE_SPELLCONE, fSize is the length of the cone in the direction of lTarget. Spell cones are always 60 degrees with the origin
  * If nShape == SHAPE_CUBE, fSize is half the length of one of the sides of the cube.

Line of Sight checks differ also based on the shape - Sphere and Cube will be from the origin location of lTarget (the centre of such areas) while Cones and Cylinders are from the calling scripts origin. 
vOrigin is rarely changed by Bioware themselves, and apparently according to the comments is only really used for cylinders and cones. For the SHAPE_SPELLCONE constant, appears lTarget is used for cone angle, lTarget is fSize away in direction of lTarget. "vOrigin" is ignored - it is NOT origin of cone -- origin of cone is location of OBJECT_SELF. 
When you use nObjectFilter it allows you to filter out undesired object types, using bitwise "or". For example, to return only creatures and doors, the value for this parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR 
#### Remarks
You must first call GetFirstObjectInShape with the same parameters before using this function. 
There are some remarks that do need clarifying: 
  * Are SHAPE_CUBE areas orientated to vOrigin or OBJECT_SELF (caller of script) objects location?
  * How are the SHAPE_CONE sized (SHAPE_SPELLCONE is apparently always 60 degrees, but rarely used. Is it 90 degrees?
  * Check on how LOS is done - is it to the casters feet (origin being 0.0, 0.0, 0.0 by default) or something odd like that?

Neither GetFirstObjectInShape() nor GetNextObjectInShape() will return a Dungeon Master object. Dungeon Masters are skipped. 
#### Known Bugs
While it usually is fine, cones _sometimes_ due to the oddities of finding objects in a particular shape returns the caster (in a spell script) who shouldn't be affected. Best to put a check for the spellcaster to exclude it from any loop using cones. 
#### Version
1.22 
#### Example
// From the Bioware script that implements the burning hands spell// [Snip][Snip]oTarget = GetFirstObjectInShape(SHAPE_SPELLCONE, 10.0, GetSpellTargetLocation(), TRUE, OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR | OBJECT_TYPE_PLACEABLE);//Cycle through the targets within the spell shape until an invalid object is captured.while(GetIsObjectValid(oTarget)){ if((oTarget)) { // Handle saving throws, damage, effects etc.  // Remember to use DelayCommand() with any EffectDamage } //Select the next target within the spell shape. oTarget = GetNextObjectInShape(SHAPE_SPELLCONE, 10.0, GetSpellTargetLocation(), TRUE, OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR | OBJECT_TYPE_PLACEABLE);}// [Snip][Snip]
#### See Also
functions:  |  GetFirstObjectInShape   

constants:  |   SHAPE_* Constants
