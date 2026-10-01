<!-- Source: https://nwnlexicon.com/index.php/GetEffectSubType -->

# GetEffectSubType(effect)
Get the subtype (SUBTYPE_*) of the effect. 
int GetEffectSubType( effect eEffect);
#### Parameters 

eEffect
    The effect you wish to compare or examine.
#### Description
Returns one of three subtype constants (SUBTYPE_*). An effect applied to an object will default to being of the Magical variety, but by using the other apply effect commands you can place supernatural or extrordinary effects on an object. 
Return a 0 on error. 
#### Remarks
You must first create and place the effect you wish to examine into a variable before calling this function. 
The different types are described on the SUBTYPE_* page, noting 0 is a valid return value sometimes - see known bugs. 
#### Known Bugs
EffectSpellFailure by default sets it's type to "0" or "not set/engine only". 
There is no subtype constant for 0, which is "valid" in so far there are a number of engine applied effects that will use it, such as Wounding or the skill Taunt. 
#### Version
1.22 
#### See Also
functions:  |   RemoveEffect   

constants:  |   SUBTYPE_* Constants
