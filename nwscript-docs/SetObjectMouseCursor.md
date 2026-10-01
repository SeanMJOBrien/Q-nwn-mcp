<!-- Source: https://nwnlexicon.com/index.php?title=SetObjectMouseCursor&amp;action=history -->

# SetObjectMouseCursor( object, int )

Overrides the mouse cursor an in game object presents. 
void SetObjectMouseCursor( object oObject, int nCursor = -1);
### Parameters 

oObject
    The object to update. 

nCursor
    A MOUSECURSOR_* constant specifying the mouse to use.
### Description
Overrides the mouse cursor an in game object presents. 
### Remarks
This is useful for instance having a sign that only ever pops up the objects description or name with a MOUSECURSOR_EXAMINE instead of the default, meaning it always is examined when clicked on. 
You can also have placeables which act as a transition with MOUSECURSOR_TRANSITION. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// Sets the given "Sign Post" placeable by tag as an examinable object. The OnClick of it could pop up its description panel using ActionExamine.void main(){ object oPlaceable = GetObjectByTag("signpost"); SetObjectMouseCursor(oPlaceable, MOUSECURSOR_EXAMINE);}
**Output** (when mouse hovers over the "signpost" oPlaceable):
