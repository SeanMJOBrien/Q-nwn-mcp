<!-- Source: https://nwnlexicon.com/index.php/EffectTimeStop -->

# EffectTimeStop()
Returns a new Time Stop effect. 
effect EffectTimeStop();
#### Description
Create a Time Stop effect. 
Time stop applies a special module-wide pause which only the object it is applied to (and DM's) can move and cast spells/attack in, without penalties or hindrance. Of course, it can't move past anyone blocking them, and effects are delayed until it is over (so if you cast True Strike in time stop, and attack, it will only work once the time stop is over). 
Unlike D&D, this does let you physically damage objects - as in physically attacking them. 
When they do attack/cast spells, they are "paused" until the effect runs out. DelayCommand is paused while in timestop, as does the game clock, see remarks for more. 
The time stop effect also makes everyone's screens go Grey, and the special Time Stop portrait where their normal one would be, as if they had paused. 
Really, time stop is the speeding up greatly of the caster, but appropriately it seems as if everyone else is frozen in time! For multiplayer, this is a pain, when a server has to wait for 1 person using timestop. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily (oh dear god don't apply this permanently!). 
#### Remarks
This interacts in a "sane" way with most things like DelayCommand(). IE: If it is the caster it will execute things as normal (so the AI can act during it) but other creatures will get events triggered at the end of the time stop, and DelayCommand() will wait until the time stop is over to continue counting down. Spell scripts will fire but the effects will obviously be delayed until the time stop ends. One untested aspect is if a player with time stop is able to "jump" triggers. Triggers should obviously be made large enough to hopefully avoid this problem. 
Use Time Stop sparingly - it is a very powerful tool, and without a way to make monsters immune to it (as in the Liches in Baldur's Gate can be immune to it, the monsters in Neverwinter Nights cannot) PCs can get a lot of free attacks or spells at higher levels (under a Haste effect it allows 3 normal spells to be cast, potentially more with Quicken). 
In multiplayer servers with high levels and unrestricted castings of this, prepared to get annoyed when time stop is cast a lot, and there are therefore lots of 9 second waits (the duration of the Bioware Time Stop spell). 
Effect functions are constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
There are no properties findable with GetEffectInteger or similar ones, so your basic GetEffectType is all you need to know it's present. 
Developers have explained the time stop effect is essentially the in-game pause function, except the creature it is applied to can still move during it. The games usual clock (which governs a lot of things like heartbeats firing, DelayCommand and other things) is paused while the game still runs, but the time stop duration is still tracked. 
There is no way to allow a creature to be excluded from the timestop effect, which is why maybe Bioware limited the effect to a mere 9 seconds duration (which with haste is still time for 3 spell casts). 
Any damage (either from attacks, from EffectDamage() etc.) is not applied immediately but is applied all at once at the end of the Time Stop effect. 
Note that scripts can fire during a time stop just like they can when the game is paused. Obviously this allows for spells to work properly, since they run scripts, and AI to react properly. 
#### Known Bugs
An odd timing issue exists, meaning that if you start or are currently casting a spell when this effect naturally ends, the game seems to force you to carry on with the animation for longer than normal. 
If you select a location to move to during time stop, and pause the game manually with Space, you jump to that location instantly. It doesn't seem to allow you past doors or other objects but you can jump over things. Obviously you can't do this in multiplayer usually but happens in singleplayer. 
#### Version
1.62 
#### Example
// Apply time stop to the entering object in a trigger,// if they are Human, for 6 seconds.void main(){ // Get the entering object object oEnterer = GetEnteringObject(); // Check race if(GetRacialType(oEnterer) == RACIAL_TYPE_HUMAN) { // Declare timestop effect eTime = EffectTimeStop(); // Apply it for 6 seconds ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eTime, oEnterer, 6.0); }}
#### See Also
functions:  |   SetTime
