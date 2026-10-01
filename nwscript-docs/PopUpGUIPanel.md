<!-- Source: https://nwnlexicon.com/index.php?title=PopUpGUIPanel&amp;action=history -->

# PopUpGUIPanel(object, int)
Displays a GUI panel to a player. 
void PopUpGUIPanel( object oPC, int nGUIPanel);
### Parameters 

oPC
    The player to show the GUI to. 

nGUIPanel
    A GUI_PANEL_* constant specifying the panel to display. Will not work with GUI_PANEL_COMPASS, GUI_PANEL_LEVELUP, GUI_PANEL_GOLD_*, or GUI_PANEL_EXAMINE_*.
### Description
Spawn a GUI panel for the client that controls oPC. Nothing happens if oPC is not a player character or if an invalid value is used for nGUIPanel. 
### Remarks
For the original GUI panel, GUI_PANEL_PLAYER_DEATH, you probably are looking for PopUpDeathGUIPanel which contains at least some options for it - such as sHelpString to allow you to alter what it says on it. 
NWN:EE added the option to pop up more GUI panels; see GUI_PANEL_* for a list. You might want to pop these up intentionally for particular reasons at particular moments, such as in combination with a OnPlayerTarget event which needs to target an item in your inventory. Or you might disable the GUI panel with SetGuiPanelDisabled and either contextually pop it up (see OnPlayerGuiEvent and GUIEVENT_DISABLED_PANEL_ATTEMPT_OPEN) or pop up using a new button or action. 
### Version
This function was updated in 1.85.8193.30 of NWN:EE. Added additional GUI_PANEL_* options, with the exception of the compass, levelup, gold and examine panels (since these require some major context). 
### See Also
functions:  |  PopUpDeathGUIPanel SetGuiPanelDisabled  

constants:  |  GUI_PANEL_* Constants
