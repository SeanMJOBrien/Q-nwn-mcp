<!-- Source: https://nwnlexicon.com/index.php/SetTransitionTarget -->

# SetTransitionTarget(object, object)

Sets the transition target for oTransition. 
object SetTransitionTarget( object oTransition, object oTarget);

### Description
Sets the transition target for oTransition. 
  * oTransition can be any valid game object, except areas.
  * oTarget can be any valid game object with a location, or OBJECT_INVALID (to unlink).
  * Rebinding a transition will NOT change the other end of the transition; for example, with normal doors you will have to do either end separately.
  * Any valid game object can hold a transition target, but only some are used by the game engine (doors and triggers). This might change in the future. You can still set and query them for other game objects from nwscript.
  * Transition target objects are cached: The toolset-configured destination tag is used for a lookup only once, at first use. Thus, attempting to use SetTag() to change the destination for a transition will not work in a predictable fashion.

**Note:** for a real area transition or door the target setup in the toolset must be a waypoint or door which is checked on module load. See the Known Bugs in how this affects 1.69. This function can be used after load to set a different object type. 
### Remarks
This is primarily useful for altering the transitions to move to or back from newly created areas using CopyArea or CreateArea. 
You can also use it to override the default behaviour of default door tranistions to store something more interesting - perhaps you want a door that teleports you to a specifically created placeable, or even a creature instance that is moving around. 
A secondary use is, as suggested by the description, a very fast-access single-sized Get/SetLocalObject() alternative (and even GetObjectByTag() alternative). If there is no tranisition functionality for the object it is "safe" to use as long as scripts don't clash. Demonstrationable speed improvements to a stored "array" (or rather linked list) is possible by using a simple object like a waypoint and chaining the waypoints together to refer to the next one along, compared to using dozens of GetObjectByTag() to loop objects with storage on them. 
You could also conceptually use it to sort waypoint pathing, even dynamically or randomly, by having each waypoint point to the next location to use. 
### Known Bugs
There is a bug where is an area transition or door points to the tag of a object that isn't a door or waypoint it will fail when set like this in the toolset, whereas it worked in 1.69. It has been reported here. It will not affect applying this function after module load however. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | DestroyArea() CopyArea() CreateArea() GetTransitionTarget()
