<!-- Source: https://nwnlexicon.com/index.php/PopUpDeathGUIPanel -->

# PopUpDeathGUIPanel(object, int, int, int, string)
Displays a customizable death panel. 
void PopUpDeathGUIPanel( object oPC, int bRespawnButtonEnabled = TRUE, int bWaitForHelpButtonEnabled = TRUE, int nHelpStringReference = 0, string sHelpString = "");

### Parameters 

oPC
    The player to show panel to. 

bRespawnButtonEnabled
    If this is TRUE, the "Respawn" button will be enabled (Default: TRUE) 

bWaitForHelpButtonEnabled
    If this is TRUE, the "Wait For Help" button will be enabled (Default: TRUE) 

nHelpStringReference
    String reference to display for help. (Default: 0) 

sHelpString
    String to display for help which appears in the top of the panel. (Default: "")
### Description
Displays a death panel that can turn off the "Respawn" or "Wait for Help" buttons. The "Wait for Help" button is only enabled when the game is running in multiplayer mode. 
By default if sHelpString isn't specified, the value used is "Choose an option below. Respawning will incur a penalty of 50 XP per level of your character and the loss of 10% of your gold." (strref 66219 single player, 6600 for multiplayer). 
### Remarks
The BioWare death dialog can be displayed using the PopUpGUIPanel() function. 
sHelpString should be changed when using a penalty for dying other than the default to avoid inconsistencies. 
nHelpStringReference is an index into either the dialog.tlk file or a custom .tlk file associated with the module. 
### Version
1.61 
### See Also
functions:  | PopUpGUIPanel  

events:  | OnDeath Event
