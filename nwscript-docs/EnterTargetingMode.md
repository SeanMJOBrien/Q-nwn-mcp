<!-- Source: https://nwnlexicon.com/index.php/EnterTargetingMode -->

# EnterTargetingMode(object, int, int)

Makes oPC enter a targeting mode, letting them select an object as a target. 
void EnterTargetingMode( object oPC, int nValidObjectTypes = OBJECT_TYPE_ALL, int nMouseCursorId = MOUSECURSOR_MAGIC);
#### Parameters 

oPC
    The player to enter targeting mode. 

nValidObjectTypes
    An OBJECT_TYPE_* constant specifying the type of object to target. As of 1.89.8193.37 if you use 0 will cancel any current targeting mode the client is in. 

nMouseCursorId
    A MOUSECURSOR_* constant specifying the mouse cursor to use.
#### Description
Makes oPC enter a targeting mode, letting them select an object or location as a target. 
If a PC selects a target, it will trigger the module OnPlayerTarget event. 
If you want to cancel any existing targeting modes you can do this by entering 0 for nValidObjectTypes. 
#### Remarks
The OnPlayerTarget script will run whether the player targeted a valid object or manually exited targeting mode. 
Since the OnPlayerTarget event won't know what script / reason that has occurred, it is suggested to track this from a standard integer stored on the player entering the targeting mode, eg: a "TARGET_MODE_ID" which then loads the appropriate response. 
The nValidObjecTypes can be bitmasked together so that a list can be produced of all the valid types eg: 
EnterTargetingMode(oPC, OBJECT_TYPE_CREATURE | OBJECT_TYPE_PLACEABLE);
OBJECT_TYPE_TILE is a new constant used solely in this function that counts as "the ground". OBJECT_TYPE_TILE can be passed as nValidObjectTypes to limit the player to targeting a position on the ground instead of an object, however, when the position is targeted, the targeting system will return the area object as the targeted object, so you cannot test for OBJECT_TYPE_TILE when targeting the ground. 
The targeting cursor will appear disabled (gray-colored) when targeting an object that is under a chat window, however, players can successfully target through the chat windows. 
#### Version
This function was added in 1.80.8193.14 of NWN:EE. 
This function was updated in 1.89.8193.37 of NWN:EE. nValidObjectTypes - If you use 0 will cancel any current targeting mode the client is in. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  | GetTargetingModeSelectedObject() GetTargetingModeSelectedPosition() GetLastPlayerToSelectTarget()
