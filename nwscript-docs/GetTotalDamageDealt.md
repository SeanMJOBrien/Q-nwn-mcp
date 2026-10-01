<!-- Source: https://nwnlexicon.com/index.php/GetTotalDamageDealt -->

# GetTotalDamageDealt()
Get the total amount of damage that was last dealt to the caller. 
int GetTotalDamageDealt();
#### Description
Returns the total value of the damage done to the caller, and should only be used in the OnDamaged handler event, elsewhere it is unpredictable. 
It also only returns the damage done that triggered the script, not the total damage done to it throughout a battle. 
#### Remarks
The name is also somewhat misleading in that it sounds as if your looking for the amount of damage the object has caused. That is not the case, this returns the damage done to the object and only the most recent damage dealt. 
To find the specific damage types in the event (to a degree) use GetDamageDealtByType. 
#### Version
1.61 
#### See Also
functions:  |  GetMaxHitPoints GetCurrentHitPoints GetDamageDealtByType  

events:  |   OnDamaged Event
