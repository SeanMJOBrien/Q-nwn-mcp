<!-- Source: https://nwnlexicon.com/index.php/GetEnteringObject -->

# GetEnteringObject()
Gets the object that last opened or entered the calling object. 
object GetEnteringObject();
#### Description
Returns the object that last opened or entered the calling object. 
The value returned by this function depends on the object type of the caller: 
  1. If the caller is a door or placeable it returns the object that last triggered it.
  2. If the caller is a trigger, area of effect, module, area or encounter it returns the object that last entered it.

Return value on error: OBJECT_INVALID. 
#### Remarks
This function is identical to GetClickingObject - Bioware sometimes uses them interchangably, and usefully for scripters it also means scripts can be reused wholesale for multiple events, in this case OnEnter, OnClick and OnFailToOpen. 
The return value *should* always be a creature since those are the only objects that move, and can click on things/trigger traps. 
As with other events it is common for DMs to not cause the events that use GetEnteringObject to fire, but you can check this with GetIsDM. 
#### Example
// Greet any Players that come into a trigger set around a drunk in a tavern.void main(){ if(GetIsPC(GetEnteringObject())) { AssignCommand(GetNearestObjectByTag("TavernPatron"),SpeakOneLinerConversation("DrunkGreeting")); AssignCommand(GetNearestObjectByTag("TavernPatron"),ActionPlayAnimation(ANIMATION_LOOPING_PAUSE_DRUNK)); }}
#### See Also
functions:  |   GetExitingObject   

events:  |   OnUsed Event  OnEnter Event
