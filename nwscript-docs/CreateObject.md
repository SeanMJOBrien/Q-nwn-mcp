<!-- Source: https://nwnlexicon.com/index.php/CreateObject -->

# CreateObject(int, string, location, int, string)

Create an object of a specified type at a given location. 
object CreateObject( int nObjectType, string sTemplate, location lLocation, int bUseAppearAnimation = FALSE, string sNewTag = "");
### Parameters 

nObjectType
    A OBJECT_TYPE_* constant matching the type of object to create. See below for details. 

sTemplate
    The resref of the object to create from the palette 

lLocation
    The location at which to create the object 

bUseAppearAnimation
    If TRUE, it will play EffectAppear() when created - the creatures appear animation will play (Default: FALSE) 

sNewTag
    If this string is not empty, it will replace the default tag from the template (Default: "")
### Description
This function allows the creation of specific objects at any location within a module. Using this function it is possible to spawn items, creatures, placeables, stores, and waypoints on the occurrence of certain events. 
Only the following constants are valid for the nObjectType parameter: 
  * OBJECT_TYPE_ITEM
  * OBJECT_TYPE_CREATURE
  * OBJECT_TYPE_PLACEABLE
  * OBJECT_TYPE_STORE
  * OBJECT_TYPE_WAYPOINT (as of patch 1.30)

If sNewTag is specified (other than the default ""), the created object will be given that new tag. 
Note that you can't use DelayCommand() with this function, since DelayCommand() only works with void-returning functions, and CreateObject() returns the created object. Instead, you must create a wrapper function and delay _that_. BioWare has already provided us with such a wrapper function in an include file: it is called CreateObjectVoid(). 
### Remarks
#### Templates
Be careful with sTemplate. A ResRef is a unique key into the palette of objects that comes with the engine and your module. If you attempt to look up the ResRef of a standard placeable or creature, it's natural to right-click the object in the palette and look for a "Properties" option to examine. It isn't there, and the next-best-thing is very tempting — "Edit Copy". Sure enough, "Edit Copy" gives you the appropriate object properties dialogue, and there's a blueprint ResRef, for example "SKELETON001". 
Unfortunately, the Toolset has done what it said it would — shown you a copy of the blueprint, not a copy of an object created using the blueprint, as you might expect. So your ResRef is in fact a toolset-generated reference string for a new blueprint - one which promptly disappears when you cancel the properties screen to go back to the Script Editor. To make matters that little bit more confusing, by default the Tag of an object created from a standard blueprint is the same as the blueprint ResRef, which might lead you to mistake a Tag for a ResRef. 
The easiest way to find the ResRef for a resource is to click on the "View" menu and select the "Show Preview Window" menu item. This will cause a preview window to appear which details not only the ResRef, but the Name, Tag, and Comments for a particular resource (when available). You can view properties by clicking on an already existing object or choosing an object from the various palettes within the toolset. 
#### Creatures
Bear in mind that the OnSpawn script will run once the current script has finished, so check that commands and actions following CreateObject will not be undone by that script. DelayCommand can be used with a small delay to ensure commands and actions are assigned after OnSpawn has finished, if necessary. 
### Known Bugs
In older patches, providing an invalid sTemplate would create a badger (if trying to make a creature) or a Miscellaneous Small item (if trying to make an item). As of patch 1.30, this is no longer the case — an invalid sTemplate will simply not create anything. 
As of patch 1.30, bUseAppearAnimation finally works, though there's been reports that some of the appear animations are a little weird. 
According to BioWare, there was a problem creating waypoints with map pins. This is not mentioned in the release notes for patch 1.31. The problem still persists in 1.61. 
Creating a creature during the OnEnter event without first checking to see what's actually entering the area causes NWN to enter an infinite loop of creating creatures (as each creature created causes the OnEnter event to fire its attached script again). This can be avoided by testing if GetIsPC(GetEnteringObject()) is true (if it's true, then create the creature(s); if it's false then a creature that was created fired the event). 
### Version
1.62 
### Example
// The following script will create a chicken next to waypoint.// The waypoint used is tagged "CHICKEN_WAYPOINT".// The deadly chicken is from the standard pallet. There are lists// of creatures Res Refs for standard pallet creatures in the lexicons// lists, with explanations of what they spawn.// Note that this deadly chicken shouldn't be created from an area's// On Enter event, unless there are checks making sure that no// more then one deadly chicken can be created.void main(){ // Object type to create int nObjectType = OBJECT_TYPE_CREATURE; // What to create - a "standard" chicken (noting its deadly 1d2 // damage attack - not what I'd call standard, eh? more like // death incarnate for those who annoy it...) string sChicken = "nw_chicken"; // Where to make the chicken appear location lTarget = GetLocation(GetWaypointByTag("CHICKEN_POINT")); // We do want appear animation // - flying down to our chicken point! int bUseAppearAnimation = TRUE; // Actually create the object. Note the example below will // actually use the object later on, not just call it.  CreateObject(nObjectType, sChicken, lTarget, bUseAppearAnimation);}
// Example 2 will take similar parameters to the above (using // some more directly into the function), but once// the chicken has appeared, it will make it super chicken, // by making it god - giving it the power of Plot Mode (TM)// (Plot mode is a trade mark of the Bioware God and Godess // society, Canada)void main(){ // It might look the same chicken... string sChicken = "nw_chicken"; // ...which will appear at the same place... location lTarget = GetLocation(GetWaypointByTag("CHICKEN_POINT")); // ...and be created the same way...  // (Note: we now use a declared object to capture the new  // created chicken) object oChicken = CreateObject(OBJECT_TYPE_CREATURE, sChicken, lTarget, TRUE); // ...but we make it Super Chicken now we created it! SetPlotFlag(oChicken, TRUE);}
// Example 3.// We create an object using a delayed function. // * You can also see CreateObjectVoid() for this function's use.// Note that this:/*void main(){ // Chicken again. string sChicken = "nw_chicken"; // Chicken point. location lTarget = GetLocation(GetWaypointByTag("CHICKEN_POINT")); // Will not work - DelayCommand() requires a "void" function. DelayCommand(50.0, CreateObject(OBJECT_TYPE_CREATURE, sChicken, lTarget, TRUE));}*/// ...Will not work, as DelayCommand() will only work if the// function has "void" or "action" in front of it, for example, // ApplyEffectToObject() will work, it has been declared by Bioware// as "void ApplyEffectToObject(int nDurationType, effect eEffect, object oTarget, float fDuration=0.0f)"// So therefore, we use this void function to delay the creation// of our chicken; we won't make him god this time however.void CreateObjectVoid(int nObjectType, string sTemplate, location lLoc, int bUseAppearAnimation = FALSE){ CreateObject(nObjectType, sTemplate, lLoc, bUseAppearAnimation);}void main(){ // Chicken again. string sChicken = "nw_chicken"; // Chicken point. location lTarget = GetLocation(GetWaypointByTag("CHICKEN_POINT")); // Will work - we use new void declared function. DelayCommand(50.0, CreateObjectVoid(OBJECT_TYPE_CREATURE, sChicken, lTarget, TRUE));}
### See Also
functions:  | CreateObjectVoid CreateItemOnObject  

constants:  | OBJECT_TYPE_* Constants
