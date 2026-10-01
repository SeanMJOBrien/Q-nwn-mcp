<!-- Source: https://nwnlexicon.com/index.php?title=GetLastGuiEventObject&amp;action=history -->

# GetLastGuiEventObject()

Gets an optional object of specific gui events in the module OnPlayerGuiEvent event. 
object GetLastGuiEventObject();
#### Description
Gets an optional object of specific gui events in the module OnPlayerGuiEvent event. 
  * GUIEVENT_MINIMAP_MAPPIN_CLICK: The waypoint the map note is attached to.
  * GUIEVENT_CHARACTERSHEET_*_CLICK: The owner of the character sheet.
  * GUIEVENT_PLAYERLIST_PLAYER_CLICK: The player clicked on.
  * GUIEVENT_PARTYBAR_PORTRAIT_CLICK: The creature clicked on.
  * GUIEVENT_DISABLED_PANEL_ATTEMPT_OPEN: For GUI_PANEL_CHARACTERSHEET, the owner of the character sheet.

#### Remarks
Anything not listed above has no additional integer properties, whereupon this will return OBJECT_INVALID by default. 
The GUIEVENT_CHARACTERSHEET_*_CLICK matters since you can open the character sheet of familiars, animal companions, summons and henchmen. 
While you'd think GUIEVENT_PARTYBAR_PORTRAIT_CLICK could never return the player themselves, it can do if they first possess their familiar, which puts their PC character in the party bar. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerGuiEvent for context and an example. 
#### See Also
functions:  |  GetLastGuiEventPlayer GetLastGuiEventType GetLastGuiEventInteger  

events:  |  OnPlayerGuiEvent
