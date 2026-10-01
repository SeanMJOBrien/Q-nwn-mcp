<!-- Source: https://nwnlexicon.com/index.php?title=SetObjectVisualTransform&amp;action=history -->

# SetObjectVisualTransform(object, int, float, int, float, int)

Sets a visual transform on the given object. 
float SetObjectVisualTransform( object oObject, int nTransform, float fValue, int nLerpType = OBJECT_VISUAL_TRANSFORM_LERP_NONE, float fLerpDuration = 0.0, int bPauseWithGame = TRUE);
#### Parameters 

oObject
    Can be any valid Creature, Placeable, Item or Door. 

nTransform
    An  OBJECT_VISUAL_TRANSFORM_* constant specifying the tranform type to apply 

fValue
    Depends on the transformation to apply. 

nLerpType
    An  OBJECT_VISUAL_TRANSFORM_LERP_* constant specifying the interpolation type to use (default: OBJECT_VISUAL_TRANSFORM_LERP_NONE) 

fLerpDuration
    Duration of the interpolation to perform, ignored if nLerpType is OBJECT_VISUAL_TRANSFORM_LERP_NONE. (default: 0.0) 

bPauseWithGame
    If TRUE then the interpolation will be paused if the game is. If FALSE it will continue on during a pause. Ignored if nLerpType is OBJECT_VISUAL_TRANSFORM_LERP_NONE. (default: TRUE)
#### Description
Sets a visual transform on the given object. These changes are relative to the given objects facing and current position, and the scale parameter is relative not absolute (so 1.5 is 50% bigger, 0.5 is half size). 
This function works only on the object's visual presentation and does not change properties of the object. For example, if a script is used to translate a placeable, the placeable will appear to move to a new position, however, the object's actual position (as retrieved by GetPosition has not changed. Additionally, if a placeable is visually translated, then clicked on to use, the PC object will move to the original position of the placeable, not the translated position. Additionally, this function will translate objects outside the areas boundaries and an invisible object remains at the original location, presenting a potential hazard to navigation/pathfinding issue. 
If nLerpType is set to something other than OBJECT_VISUAL_TRANSFORM_LERP_NONE then the transformation isn't instant, instead it will do it over fLerpDuration. For instance growing an objects size over 6 seconds does a nicer growth then just instantly getting to be the given size. You can see the options for this under the  OBJECT_VISUAL_TRANSFORM_LERP_* constants. 
Returns the old/previous fValue that was set. 
If used on a player in a PW setting it is saved to the players BIC on exit, and applied when loaded. 
If OBJECT_VISUAL_TRANSFORM_SCALE is used, NWN:EE should now take into account walk/run steps and alter them to properly fit the new scale. 
#### Remarks
This has several useful applications for both creatures, placeables, items and doors. 
The item transformations can only occur when it is placed on the ground or in someones hands and has a model (not in a placeable itself). An item retains it's changes if dropped on the ground. Some bits of an equipped item like the visual effect when at a fire high damage do not scale however. Example held items could be right and left hand slots, helmet slot and cloak slot. The armor is consider their "body" really thus unaffected. 
If you visually translate an item or placeable somewhere else, the clickable part follows it, meaning if you visually transform an item under the ground it's still usable (eg; by ActionExamine) but cannot be (easily) clicked by a player making it safer to spawn for viewing or whatnot. 
Placeables must be non-static for this to work on them (the usable flag isn't required). For more information about placeable states see the nwn.wiki page. 
Creatures transformed retain their appearance.2da values for PERSPACE and CPERSPACE, so a "Enlarged" creature appearance would start to clip into terrain. 
Some ideas for potential useful or fun uses of this: 
  * Giant area - all placeables are scaled down in size while the player stays the same size. Works especially well in tilesets with little in built terrain
  * Raising from the dead - A creature's Z location can be translated under the map, an animation played and they are gradually "raised" upwards to where Z = 0.0
  * Flying - With some appropriate animation set, a Z translation upwards can make a creature fly.
  * Displacement - Have the character randomly blink around their X, Y location when under the effect of some defensive spells to make it seem as if they're dodging in and out of space.
  * Mad world - Have placeables on ceilings, on walls, or spinning around.

A more advanced usage would be on a non-static placeable that is incredibly large - but would pop in/out of view of the player (Due to the 45M distance range on placeables loading) several versions of the placable could be put at discrete distances that essentially overlap using this command (meaning one at least always visible). 
Note the visual transformation can only be done completely smoothly with the lerping option on. 
There are some oddities around the lerping visual transform code. This is the most reliable way to do a lerp: 
  * Starting a new LERPed visual transform restarts all existing LERP visual transforms currently on the object.
  * Applying a new LERPed visual transform to the object that has a previous LERPed visual transform creates odd behavior. The best way to normalize this is to apply a non-LERPed visual transform before applying your new LERPed one, with a brief delay command. For example:

SetObjectVisualTransform(oPLC, OBJECT_VISUAL_TRANSFORM_ROTATE_Y, 30.0);DelayCommand(0.1, SetObjectVisualTransformWrapper(oPLC, OBJECT_VISUAL_TRANSFORM_ROTATE_Y, 90.0, OBJECT_VISUAL_TRANSFORM_LERP_LINEAR, 5.0));
(NB: SetObjectVisualTransformWrapper here is just a helper function that duplicates SetObjectVisualTransform without an object return, so it can be delayed.) 
Doing it this way will rotate the object to 90 degrees starting from 30 degrees...most of the time. You will still see some strangeness if the client is losing perception of the object at any point, as this will restart the LERPed transforms for that client. To work around this partially at least for placeables you can use SetObjectVisibleDistance. 
#### Version
This function was added in 1.74.8169 of NWN:EE. 
This function was updated in 1.83.8193.21 of NWN:EE. It added the Interpolation options to allow transforms to be made over a number of seconds instead of instantly. 
#### Example
The following script is an example from an OnAOEEnter script that fires when a PC object enters an AOE that set around a placeable. It will visually transform the placeable a specific distance (Unit Vector * Unit Multiplier) from the PC, in the same direction the PC is facing when they entered the AOE. The placeable "target" is set as a LocalObject on the AOE when the AOE was created. 
Note: Checks to ensure the validity of the destination are not included. 
void main(){ // Get the entering object and filter for PCs object oPC = GetEnteringObject(); if (GetIsPC(oPC) == FALSE) return; // Set the vector multiplier to determine the transform distance from // the original location and get the unit vector float fUnitMultiplier = 3.0; vector vUnitVector = AngleToVector(GetFacing(oPC)); // Get the starting position object oTarget = GetLocalObject(OBJECT_SELF, "AOE_TARGET"); vector vTarget = GetPosition(oTarget); // Create new coordinates with the modified unit vector float fX = vUnitVector.x * fUnitMultiplier; float fY = vUnitVector.y * fUnitMultiplier; // Set the new coordinates onto the target object (for visual purposes only) SetObjectVisualTransform(oTarget, OBJECT_VISUAL_TRANSFORM_TRANSLATE_X, fX); SetObjectVisualTransform(oTarget, OBJECT_VISUAL_TRANSFORM_TRANSLATE_Y, fY);}
#### See Also
functions:  | GetObjectVisualTransform()   

constants:  |  OBJECT_VISUAL_TRANSFORM_* Constant Group  OBJECT_VISUAL_TRANSFORM_LERP_* Constant Group
