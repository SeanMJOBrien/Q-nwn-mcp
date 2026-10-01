<!-- Source: https://nwnlexicon.com/index.php/GetLastRestEventType -->

# GetLastRestEventType()
Determines the status of the last PC rest. 
int GetLastRestEventType();
#### Description
Determine the type (REST_EVENTTYPE_REST_*) of the last rest event as returned from the OnPlayerRest module event. 
#### Remarks
The OnPlayerRest event will fire in three different events: 
  * A PC begins to rest
  * A PC's rest is cancelled
  * A PC successfully finished resting (not cancelled)

Thus, resting will always fire the OnPlayerRest event twice: Once when the rest starts, and again when it is either finished or cancelled. 
The REST_EVENTTYPE_REST_INVALID should only occur on error, and if you strictly use this function in the OnPlayerRest event, that should never happen. 
#### Version
1.61 
#### Example
//Example structure of a OnPlayerRest event scriptvoid main(){ object oPC=GetLastPCRested(); int nRestType=GetLastRestEventType(); switch (nRestType) { case REST_EVENTTYPE_REST_STARTED: SendMessageToPC(oPC, "You start resting"); break; case REST_EVENTTYPE_REST_FINISHED: SendMessageToPC(oPC, "Had a good night's sleep?"); break; case REST_EVENTTYPE_REST_CANCELLED: SendMessageToPC(oPC, "WAKE UP!!!"); break; default: SendMessageToPC(oPC, "You should never see this"); break; }}
#### See Also
functions:  |   GetLastPCRested   

constants:  |   REST_EVENTTYPE_* Constants   
events:  |   OnPlayerRest Event
