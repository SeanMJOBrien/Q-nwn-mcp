<!-- Source: https://nwnlexicon.com/index.php?title=GetLastGuiEventInteger&amp;action=history -->

# GetLastGuiEventInteger()

Gets an optional integer of specific gui events in the module OnPlayerGuiEvent event. 
int GetLastGuiEventInteger();
#### Description
Gets an optional integer of specific gui events in the module OnPlayerGuiEvent event. 
  * GUIEVENT_CHATBAR_*: The selected chat channel. Does not indicate the actual used channel. 0 = Shout, 1 = Whisper, 2 = Talk, 3 = Party, 4 = DM
  * GUIEVENT_CHARACTERSHEET_SKILL_SELECT: The skill ID.
  * GUIEVENT_CHARACTERSHEET_FEAT_SELECT: The feat ID.
  * GUIEVENT_EFFECTICON_CLICK: The effect icon ID (EFFECT_ICON_*)
  * GUIEVENT_DISABLED_PANEL_ATTEMPT_OPEN: The GUI_PANEL_* the player attempted to open.

#### Remarks
Anything not listed above has no additional integer properties, whereupon this will return 0 by default. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
See OnPlayerGuiEvent for context and an example. 
#### See Also
functions:  |  GetLastGuiEventPlayer GetLastGuiEventType GetLastGuiEventObject  

events:  |  OnPlayerGuiEvent
