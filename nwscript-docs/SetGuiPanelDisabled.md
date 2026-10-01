<!-- Source: https://nwnlexicon.com/index.php/SetGuiPanelDisabled -->

# SetGuiPanelDisabled(object, int, int)

Disable a gui panel for the client that controls the given player. 
void SetGuiPanelDisabled( object oPlayer, int nGuiPanel, int bDisabled);
#### Parameters 

oPlayer
    Player to disable the panel of. Note if they are possessing a creature it must be that creature that is used (targeting just the original PC does nothing). 

nGuiPanel
    The GUI_PANEL_* constant of a panel to disable or enable, except GUI_PANEL_PLAYER_DEATH. 

bDisabled
    TRUE to disable the panel and FALSE to enable it
#### Description
Disable a gui panel for the client that controls oPlayer. 
Notes: Will close the gui panel if currently open, with the exception of GUI_PANEL_LEVELUP or GUI_PANEL_GOLD_*. 
Does not persist through relogging or in savegames. 
Will fire a GUIEVENT_DISABLED_PANEL_ATTEMPT_OPEN OnPlayerGuiEvent for some gui panels if a player attempts to open them. 
You can still force show a panel with PopUpGUIPanel. 
#### Remarks
You should store the state of the disabling with a local variable if it is important to retain since it is not retained usually. Due to the save game remark, you cannot capture when a save game is opened _directly_ but the event EVENT_SCRIPT_MODULE_ON_CLIENT_ENTER will fire when a save game is loaded (it essentially, when loading, will start a new game with the .sav file and the player connects to it afresh, and is moved to where they were previously). 
Disabling the character sheet also stops you opening the character sheet of allies (eg; Familiars, henchmen). 
You can't close every single panel in the game - for instance you can't stop levelling, you can't stop resting (although there are other ways to stop resting, such as area properties or the OnPlayerRest event). The examine button still works. You can still use the radial menu for most functionality of the game. You can still be in a conversation. 
A placeable object with an inventory, as well as OpenStore, still opens the inventory panel even if it is disabled. Once closed it cannot be reopened however. 
The compass will reappear instantly if the panel is re-enabled, since there is no button to open it usually. No other panel will automatically reappear however. 
This is useful for possibly; 
  * Disabling some panels at a RP heavy part of the game where the player shouldn't be distracted
  * Customising when certain panels can be used due to context; for instance stopping the inventory or spellbook being used in combat. 
    * As noted you can capture closed panels and allow them to be opened with the OnPlayerGuiEvent due to context, and supply a message if it is blocked otherwise. Note the compass has no such event (it is usually always open)
  * Closing panels - for instance if you want to make sure a player isn't using their character sheet for some reason, or to close _most_ panels before something occurs (although cutscene mode may be an easier way!)
  * Disabling the map and compass for a "weird place" where there would be no mapping and no north

As noted in the parameters the oPlayer object must be the actively used "body" - ie if a familiar is being possessed then it will be that object. You usually only care about familiars, which you can force them out of with UnpossessFamiliar, or just confirm the object is possessed with GetIsPossessedFamiliar. 
#### Version
This function was added in 1.85.8193.30 of NWN:EE. 
#### Example
// A script action where a seagull takes the players compass// Note we should record we've done this with a variable to re-apply it OnClientEntervoid main(){ object oPC = GetPCSpeaker(); // No compass! SetGuiPanelDisabled(oPC, GUI_PANEL_COMPASS, TRUE); SendMessageToPC(oPC, "The seagull grabbed your compass!");}
#### See Also
functions:  |  PopUpGUIPanel OnPlayerGuiEvent  

constants:  |  GUI_PANEL_*
