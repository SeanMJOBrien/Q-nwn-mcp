<!-- Source: https://nwnlexicon.com/index.php/AdjustAlignment -->

# AdjustAlignment(object, int, int, int)

Adjusts the alignment of a creature. 
void AdjustAlignment( object oSubject, int nAlignment, int nShift, int bAllPartyMembers = TRUE);
### Parameters 

oSubject
    Target to have alignment adjusted. 

nAlignment
    The ALIGNMENT_* constant matching the axis on which to adjust the alignment. 

nShift
    The desired amount to shift the alignment (numeric range from -100 to 100). 

bAllPartyMembers
    If FALSE, only oSubject's alignment will change. If TRUE, the entire party's will. (Default: TRUE)
### Description
Adjust the alignment of oSubject. 
nAlignment determines the axis on which the alignment changes: 
  * ALIGNMENT_LAWFUL, ALIGNMENT_CHAOTIC, ALIGNMENT_GOOD, ALIGNMENT_EVIL: alignment will be shifted in the direction specified.
  * ALIGNMENT_ALL: nShift will be applied to oSubject's law/chaos and good/evil alignment values (thus adding/subtracting the same amount to both).
  * ALIGNMENT_NEUTRAL: nShift is applied to oSubject's law/chaos and good/evil alignment values in the direction which is towards neutrality.

### Remarks
Alignment is not treated as a continuous scale running from 0 to 100, but in three bands running from 0 to 30, 31 to 69 and 70 to 100. Whenever a call to AdjustAlignment() takes you over one of these boundaries, your character's alignment is automatically placed at the middle of the new band, (i.e., 15, 50 or 85). If we look at a character with a good/evil alignment value of 71 who performs an act that moves his alignment towards evil we get the following behavior: 
  * If the adjustment was a single point, the new alignment value would be 70 (still inside the "good" band).
  * If the adjustment is more, two or even ten points, the new alignment would be 50 (the middle of the "neutral" band).

However, if the alignment shift is sufficiently large, then the character's alignment will "skip" a band. In the case given here, an alignment shift of 41 points or more would be sufficient to give the character an evil alignment, with a good/evil value of 15. 
Example for ALIGNMENT_NEUTRAL: if oSubject has a law/chaos value of 10 (i.e. chaotic) and a good/evil value of 85 (i.e. good) then if nShift is 15, the law/chaos value will become (10+15)=25 and the good/evil value will become (85-15)=70. The ALIGNMENT_NEUTRAL shift, when positive will, at most, take the alignment value to 50 (middle of the neutral and) and not beyond (above or below). If nShift is -15 then the law/chaos value will become (10-15) = 0 (can't go below zero) and the good/evil value would become (85 + 15) = 100. If the law/chaos value is 50 (midpoint of neutrality) a negative neutral shift will be towards chaos, while if the good/evil value is 50 a negative neutral shift will be towards evil. 
Adjust alignment does not affect DMs. 
### Known Bugs
In addition to adjusting the target's alignment, this command will also cause the party leader's alignment to be adjusted at 20% of the change (minimum of 1 point). This feature was originally not documented, but in the 1.69 BioWare added an extra parameter (bAllPartyMembers) to toggle off this feature. Unfortunately, the description added to document this new parameter did not properly describe the feature being changed. The description read:      "If FALSE, only oSubject's alignment will change. If TRUE, the entire party's will."
when it should read:      "If FALSE, only oSubject's actions will change his alignment. If TRUE, the entire party's actions will."
### Version
1.69 
### Example
// Example 1// Placed in an NPC's OnDeath script, this will adjust the killer's reputation// 10 points toward evil. This will not change the killer's party's alignment.void main(){ object oKiller = GetLastKiller(); AdjustAlignment(oKiller, ALIGNMENT_EVIL, 10, FALSE);}
### See Also
functions:  | GetReputation  

constants:  | ALIGNMENT_* Constants
