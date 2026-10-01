<!-- Source: https://nwnlexicon.com/index.php/ActionWait -->

# ActionWait

# ActionWait(float)
Adds a wait action to an objects queue. 
void ActionWait( float fSeconds = 0.0);
#### Parameters
_fSeconds_
Time, in seconds, to wait. (Default: 0.0) 
#### Description
Adding ActionWait() to an object action queue causes the object to pause fSeconds seconds before performing the next action in the queue. 
#### Remarks
ActionWait() is useful for getting NPCs or other objects to stop what they're doing for a short amount of time before continuing a further sequence of actions. N.B., ActionWait will NOT introduce a pause in the execution of your script - nothing will. If you want to delay the engine's execution of a piece of code (rather than an object's execution of an action), you should use DelayCommand() on an ExecuteScript() call instead. 
#### Version
1.22 
#### Example
/* This code in an NPC's script will queue a set of actions to * make the NPC walk to a waypoint ("WP_LOOKING_1"), * yell "Is anyone there?", pause 5 seconds for a response, * and be suitably disappointed */ActionMoveToObject(GetObjectByTag("WP_LOOKING_1"));ActionSpeakString("Is anyone there?");ActionWait(5.0);ActionSpeakString("Dang!");// --- NPC/NPC conversation ---/* This sequence of Actions in a trigger's OnEnter script * will simulate a short conversation between two nearby NPCs.*/object oFrodo = GetObjectByTag("Frodo");object oSam = GetObjectByTag("Sam");AssignCommand(oSam, ActionWait(2.0));AssignCommand(oFrodo, ActionSpeakString("Oh, Sam, will we ever make it to Mordor?"));AssignCommand(oFrodo, ActionWait(4.0));AssignCommand(oSam, ActionSpeakString("Of course we will, Master Frodo, if that pesky Gollum doesn't strangle us first."));AssignCommand(oSam, ActionWait(4.0));AssignCommand(oFrodo, ActionSpeakString("You're always so cheerful, Sam. I'm glad we're pals");AssignCommand(oSam, ActionSpeakString("Pals? When this is over, you and I are going to have a long talk about the definition of 'walking holiday'.");
#### See Also
functions:  |   DelayCommand
