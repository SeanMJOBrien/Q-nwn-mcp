<!-- Source: https://nwnlexicon.com/index.php?title=ActionDoCommand&amp;action=history -->

# ActionDoCommand(action)

Inserts a command into the Action Queue. 
void ActionDoCommand( action aCommand);

### Parameters 

aCommand
    Void returning function to execute (ignore "action" data type).
### Description
Inserts the function call aCommand into the Action Queue, ensuring the calling object will perform actions in a particular order. 
Without the use of this function, in general, any function not beginning with "Action" will not be inserted into the queue. This means they will preempt other, previously called functions in the Action Queue and execute immediately. 
### Remarks
The target of this function is the object making the call. If it's necessary to command other objects or NPCs then use AssignCommand(). ActionDoCommand() can be nested inside of an AssignCommand() call to add a Command to the targeted object's action queue. 
ActionDoCommand() can only accept void-returning functions (and, of course, Bioware defined action-returning functions; however, that'd be a silly use of this function, as those already add their actions to the queue). If you want to use a function that returns a value, you will have to wrap that function in a void-returning function call. For an example of a void-returning wrapper function, see CreateObjectVoid(). 
Note that, though it takes an "action" type as a parameter, NWScript doesn't allow you to use the action keyword. (BioWare can put it in function declarations, but we can't use it in function declarations ourselves.) So action aDo = SendMessageToPC(oPC, "Message"); will not work. You need to put the actual SendMessage... (or whatever) inside the ActionDoCommand() call like so: ActionDoCommand(SendMessageToPC(oPC, "Message"));. 
The use of void would work exactly the same as action commands in the sense of ActionDoCommand(), however, but code executes instead of a physical action. However, in some cases, such as doing ActionDoCommand(SpeakString("Hello")); would be the same as ActionSpeakString("Hello");. 
ActionDoCommand() will not function on an object which does not have an Action Queue. 
### Known Bugs
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

When used in a script during the OnSpawn event, its possible for a creature to assume strange behavior. 
### Version
1.61 
### Example
// Without ActionDoCommand()// In this example the calling NPC will first speak the string// "here's my seat", and then walk to the chair and sit.{ object oChair = GetObjectByTag("chair"); ActionMoveToObject(oChair); SpeakString("Here's my seat!"); ActionSit(oChair);}// With ActionDoCommand()// In this example the NPC will execute the functions in the order// given (as they are in the NPCs Action Queue): first walk to the// chair, then speak the string and sit down.{ object oChair = GetObjectByTag("chair"); ActionMoveToObject(oChair); ActionDoCommand(SpeakString("Here's my seat!")); ActionSit(oChair);}
### See Also
functions:  |  MoveToNewLocation
