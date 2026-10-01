<!-- Source: https://nwnlexicon.com/index.php?title=SetObjectHiliteColor&amp;action=history -->

# SetObjectHiliteColor( object, int )

Overrides the mouse-over (“hilite”) colour on objects. 
void SetObjectHiliteColor( object oObject, int nColor);
### Parameters 

oObject
    The object to update hilite colors. 

nColor
    The color hilite to apply to the object.
### Description
Sets oObject's hilite color to nColor. The nColor format is 0xRRGGBB; -1 clears the color override. 
This is purely a visual effect when a player mouses over (or presses tab) and sees the glow around a object - the default for creatures depends on their enemy/friend to you, while objects have a default one set in the game options (usually white). 
### Remarks
The effect is game-wide. For singleplayer or co-op modules this means it is easy to show or hide information as required for certain objects. An example is provided in the script section. 
For multiplayer it applies to everyone, so could be used for team colours in a PvP mode, but is less useful for hiding information - would another player know a certain chest is empty? Instanced dungeons which are more common in NWN:EE tend to alleviate this. 
Black (or 0x000000) is considered "off" and basically removes the "glow" entirely (although it overlays some black on the object). 
Custom-content wise if you want to remove the "glow" (or even just alter it) the file the game uses is fxpa_dot02.tga - you can blank it out to remove the glow entirely, or change it for another texture. It's only used in a sole placeable in the base game models (most use fxpa_dot01.tga, eg; spell vfx and the like). 
It is also important to know the default colours can be changed by players in the game options - this is done by those with colour blindness. Other than toggling the colour off, you might want to be careful to allow some of the colours set - if used for gameplay features such as "treasure hunts" or "puzzles" - by the player in a special menu so they can complete such things properly. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// OnClosed script for placeables// This will turn a placeables hilite colour off (set to black) if// it is emptied. This makes it easier to see unsearched chests.// An alternative change can be to set the colour to something else// if there are items left, because a PC has opened it at least once.// Better for singleplayer/co-op or instanced MP areas.const int DARK_BLUE = 0x0000FF;const int DARK_RED = 0xFF0000;const int DARK_GREEN = 0x00FF00;const int BLACK = 0x000000;const int WHITE = 0xFFFFFF;void main(){ // If empty set to "all empty" colour if((GetFirstItemInInventory(OBJECT_SELF))) { SetObjectHiliteColor(OBJECT_SELF, BLACK); } else { // Else reset to default highlight // Alternatively change -1 to a colour to mark it as "searched but still has items in it" SetObjectHiliteColor(OBJECT_SELF, -1); }}
