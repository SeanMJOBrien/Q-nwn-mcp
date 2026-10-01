<!-- Source: https://nwnlexicon.com/index.php?title=GetItemPropertyDurationRemaining&amp;action=history -->

# GetItemPropertyDurationRemaining(itemproperty)

Returns the remaining duration of the item property in seconds. 
int GetItemPropertyDurationRemaining( itemproperty nProperty);
### Parameters 

nProperty
    The item property to get the remaining duration of.
### Description
Returns the remaining duration of the item property in seconds. Returns 0 if the duration type of the item property is not DURATION_TYPE_TEMPORARY. 
### Remarks
This can be used to check if a duration is due to expire soon, maybe to refresh it by removing and adding the item property again. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
This function was updated in 1.85.8193.30 of NWN:EE. Game/VM: Fixed Get*DurationRemaining returning the wrong value due to time overflow. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetItemPropertyDuration(), GetItemPropertyDurationType()
