<!-- Source: https://nwnlexicon.com/index.php?title=GetDamageDealtByType&amp;action=history -->

# GetDamageDealtByType(int)
Determines the amount of damage of a specific type dealt to an object in the On Damaged event. 
int GetDamageDealtByType( int nDamageType);
#### Parameters 

nDamageType
     DAMAGE_TYPE_*  (A single value, not OR'ed)
#### Description
Returns the amount of damage of type nDamageType that has been dealt to the caller. When called from the OnDamaged event, this function returns only the damage which was caused during that event. 
Returns -1 if the damage type is not present. 
Returns 0 if the damage was fully resisted (see however notes below on the OnDamaged event not always firing). 
The base weapon damage (DAMAGE_TYPE_BASE_WEAPON) is the base damage delivered by the weapon before any additional types of damage (e.g. fire) have been added. It will not report the type this damage was - for instance a Longsword attacking for 5 damage would report GetTotalDamageDealt as 5, GetDamageDealtByType(DAMAGE_TYPE_BASE_WEAPON) as 5, and GetDamageDealtByType(DAMAGE_TYPE_SLASHING) as -1. You may be able to use the last weapon to possibly calculate the type inflicted. 
#### Remarks
OnDamaged fires for these cases: 
  * EffectDamage - All cases, even if resisted or immune (this function returns 0 for the given damage type)
  * Weapon attacks: 
    * If they deal at least 1 point of damage, this event is fired (DAMAGE_TYPE_BASE_WEAPON will show up as 0 or higher)
    * If they deal no damage due to damage resistance or immunity, the event is skipped (OnPhysicalAttacked event still fires)

The OnPhysicalAttacked script may not fire before this one, so to get the weapon that caused the damage is sometimes tricky especially for dual wielders or creature weapons. It is at least reasonably easy to get if it was done by a ranged weapon by checking the right hand slot for a ranged type weapon. 
As noted above this function returns -1 if no damage of that type occurred. Because of this, do not use this line, it will not work correctly since this only happens if the damage is dealt but resisted entirely. 
if((DAMAGE_TYPE_FIRE))
And this line will almost always be true, as it merely does the opposite of the above - if any damage is applied (1 or higher) or the damage is not present (-1). 
if(GetDamageDealtByType(DAMAGE_TYPE_FIRE))
Therefore this would be the correct way of testing if damage of the particular type is detected (even if 0 amount is applied): 
if(GetDamageDealtByType(DAMAGE_TYPE_FIRE) != -1)ORif(GetDamageDealtByType(DAMAGE_TYPE_FIRE) >= 0)
Of course testing for >= 1 is likely a better use as per the example. 
#### Known Bugs
Previously weapon damage was not firing the OnDamaged event at all. This was fixed with the introduction of DAMAGE_TYPE_BASE_WEAPON. 
The DAMAGE_TYPE_* value passed cannot be OR'ed in (such as DAMAGE_TYPE_FIRE | DAMAGE_TYPE_SONIC) and returns an invalid result. It must be a singular entry. This was erroneously stated in previous versions of nwscript.nss comments. 
#### Version
#### Example
// If we had any fire damage applied to us, we will say some catchphrase.void main(){ if(GetDamageDealtByType(DAMAGE_TYPE_FIRE) >= 1) { // Obviously a high-strung-evangilist voiceset helps. SpeakString("Hey, baby, I'm on FIIIREEEEE!"); }}
#### See Also
constants:  |   DAMAGE_TYPE_* Constants  GetTotalDamageDealt  

events:  |   OnDamaged Event
