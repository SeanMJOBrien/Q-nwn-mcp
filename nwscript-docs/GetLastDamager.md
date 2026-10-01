<!-- Source: https://nwnlexicon.com/index.php/GetLastDamager -->

# GetLastDamager()
Get the object which last damaged a creature or placeable object. 
object GetLastDamager();
#### Description
Returns the object that last damaged the caller for an OnDamaged event script. 
Returns OBJECT_INVALID if the caller is not a valid object, or if the caller hasn't had an OnDamaged event fire yet. 
If the last damager is now not in the game (eg; from damage being done from DelayCommand from a creature who was destroyed with DestroyObject) the event call will be valid even if the damager is not. 
#### Remarks
Unlike most other GetLast* functions, GetLastDamaged is not restricted to the OnDamaged event script; however using it outside this event may mean it returns an invalid object or otherwise problematic case (such as having the damager be now friendly when in the past was hostile). 
#### Version
1.22 
#### See Also
functions:  |   GetLastKiller
