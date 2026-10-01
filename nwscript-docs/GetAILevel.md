<!-- Source: https://nwnlexicon.com/index.php/GetAILevel -->

# GetAILevel

# GetAILevel(object)
Retrieves the current AI (artificial intelligence) level that a creature is running at. 
int GetAILevel( object oTarget = OBJECT_SELF);
#### Parameters
_oTarget_
Creature to check the AI level of. (Default: OBJECT_SELF) 
#### Description
Returns the current AI_LEVEL_* value that a creature is running at. Different AI levels indicate how smart a creature acts and how much CPU time and priority it receives. Creatures that are standing by doing nothing generally have AI_LEVEL_LOW, but when a creature enters combat it will have AI_LEVEL_NORMAL by default. 
#### Remarks
Too many creatures with AI_LEVEL_NORMAL will tax the processor and performance degradation will occur. AI_LEVEL_DEFAULT is recommended. Also note that the "smartness" is not actual "The AI will decide to do a worse action" but, "The AI doesn't have as much time from the CPU, and may have delayed actions". 
On a creature with unset AI level or ai level set to -1 (default or invalid), function returns AI_LEVEL_LOW when there is a player character in same area as creature or AI_LEVEL_VERY_LOW when not. 
#### AI Levels and What It All Means When You Get Right Down To It
A long note from clippy who is intimately familiar with the game code: 
So the server runs in something called a MainLoop. Which looks something like: 
```
  while(!bExitCommandReceived) {
    HandlePlayerEvents();
    AIUpdate();
    GlobalScriptsUpdate();
    WorldTimerUpdate();
    }

```

The interesting one here is the AI update. 
It basically loops through all objects in the module and checks if they need anything - fire some scripts, move to a spot, run pathfinding, etc. 
And I do mean all objects, including static placeables. (Anphillia has about 500k of those, for example, I'm sure other PWs are much higher) 
So, iterating through 500k objects takes a long time, and if your server is blocked from handling any events in that case, you'll have horrible lag. 
So each iteration of the MainLoop, only a fixed time slice is given to AI update. I don't know the number right now, but let's pull 5ms out of my ass (editors note: a second is 1000 milliseconds, so 60 ticks (or "frames") means 16.6 milliseconds per frame, so 5ms can be a lot of this time). 
So now, you want to run an update on some objects until you run out of time. 
You need to prioritize them. AI comes in 4 priorities, VERY_LOW, LOW, NORMAL, HIGH 
Each object is given a priority and put in one of the four queues based on their priority. 
  * So 60% of the 5ms (3ms) is first spent on going through the HIGH priority queue and running updates on those.
  * Then 60% of remaining 2ms (1.2ms) is spent on NORMAL priority.
  * Then 60% of the remaining .8ms on LOW, and rest on VERY_LOW.

Now, when you run out of time in a given queue, next time AIUpdate runs you continue where you left off. 
VERY_HIGH is generally used for henchmen and creatures in combat. Normal for creatures you can see, low for ones in the areas with players but that aren't interactive yet, and very_low for everything else. 
The NWNX plugin effectively removed static placables from the very_low list, so they never update. But that had some issues I think when you tried to destroy them. Not 100% sure. Which is why it didn't end up in EE. 
But one common bug in 1.69 was that when you were in a dialog and clicked an option, you had the lag until the new text was displayed to you. This is because the object that owns the dialog had a lower AI priority, and you had to wait for it to update. 
This is fixed in EE by having a list of all objects currently in dialog and updating them every tick regardless of level. 
So for your low AI level creatures, the events are firing very rarely in the first place. Now, creatures do a bit more than other object types every tick, but even so, they won't be taking away the time from any other creature. 
They end up in the VERY_LOW list, so the only things they are contending with are other VERY_LOW objects. The way this will bite you in the ass though is if they do some really expensive calculations. Because you can only stop updating a list after you are fully done with some object, can't abort midway. 
So in some cases pathfinding can take a really long time for an object (even a VERY_LOW AI one), which will cause spikes. The profiler plugin will tell you exactly how much time is spent on pathfinding for each creature, so you can catch these cases. This happens if an NPC gets stuck between placeables and can't get out. 
#### VERY_LOW
So, a VERY_LOW AI creature will, every tick:oka 
  * Run heartbeat scripts (much rarer than 6s)
  * Tick all effects
  * Execute actions from creature action list
  * Search for traps
  * Handle AOO
  * Tick cooldown on all skills
  * Update spell slots as needed
  * Plus pathfinding (if doing a move action)

Higher levels of AI do even more. 
To make a creature not affect a server as much entirely clear their Heartbeat script (and possibly other ones) using SetEventScript. 
#### Some additional Notes
This command since it only works on creatures means placeables/doors sometimes get delays when executing what would be usual actions or scripts (heartbeats or the like). Most interactive scripts will run appropriately still however (eg; a doors OnOpen event). The priority of placeables is equivalent to the AI_LEVEL_LOW category. 
As noted profiling on a persistent world is best for long-term performance issues, usually of AI pathfinding failures you don't notice getting stuck on routines. 
#### Version
1.30 
#### Example
// If the AI level is not AI_LEVEL_DEFAULT, set it to it main(){ if(GetAILevel() != AI_LEVEL_DEFAULT) { SetAILevel(OBJECT_SELF, AI_LEVEL_DEFAULT); }}
#### See Also
functions:  |   SetAILevel   

constants:  |   AI_LEVEL_* Constants
