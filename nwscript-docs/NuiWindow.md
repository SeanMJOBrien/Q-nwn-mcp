<!-- Source: https://nwnlexicon.com/index.php/NuiWindow -->

# NuiWindow(json, json, json, json, json, json, json, json )

Create a NUI window inline for the given player. 
// -----------------------// Window// Special cases:// * Set the window title to JsonBool(FALSE), Collapse to JsonBool(FALSE) and bClosable to FALSE// to hide the title bar.// Note: You MUST provide a way to close the window some other way, or the user will be stuck with it.// * Set a minimum size constraint equal to the maximmum size constraint in the same dimension to prevent// a window from being resized in that dimension.json // WindowNuiWindow( json jRoot, // Layout-ish (NuiRow, NuiCol, NuiGroup) json jTitle, // Bind:String json jGeometry, // Bind:Rect Set x and/or y to -1.0 to center the window on that axis // Set x and/or y to -2.0 to position the window's top left at the mouse cursor's position of that axis // Set x and/or y to -3.0 to center the window on the mouse cursor's position of that axis json jResizable, // Bind:Bool Set to JsonBool(TRUE) or JsonNull() to let user resize without binding. json jCollapsed, // Bind:Bool Set to a static value JsonBool(FALSE) to disable collapsing. // Set to JsonNull() to let user collapse without binding. // For better UX, leave collapsing on. json jClosable, // Bind:Bool You must provide a way to close the window if you set this to FALSE. // For better UX, handle the window "closed" event. json jTransparent, // Bind:Bool Do not render background json jBorder, // Bind:Bool Do not render border json jAcceptsInput = // Bind:Bool Set JsonBool(FALSE) to disable all input. JSON_TRUE, // All hover, clicks and keypresses will fall through. json jSizeConstraint = // Bind:Rect Constrains minimum and maximum size of window. JSON_NULL, // Set x to minimum width, y to minimum height, w to maximum width, h to maximum height. // Set any individual constraint to 0.0 to ignore that constraint. json jEdgeConstraint = // Bind:Rect Prevents a form from being rendered within the specified margins. JSON_NULL, // Set x to left margin, y to top margin, w to right margin, h to bottom margin. // Set any individual constraint to 0.0 to ignore that constraint. json jFont = JSON_STRING // Bind:String Override font used on window, including decorations. See NuiStyleFont() for details.);
### Parameters 

jRoot

jTitle

jGeometry

jResizable

jCollapsed

jClosable

jTransparent

jBorder

jAcceptsInput

jSizeConstraint

jEdgeConstraint

jFont

#### Description
Create a NUI window inline for the given player. 
#### Remarks
  * The token is a integer for ease of handling only. You are not supposed to do anything with it, except store/pass it.
  * See nw_inc_nui.nss for full documentation.
  * Returns the window token on success (>0), or 0 on error.

  * For the special case this must be done on NuiWindow creation and can't be done though SetBind

#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  NUI Functions
