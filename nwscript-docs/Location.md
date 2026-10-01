<!-- Source: https://nwnlexicon.com/index.php?title=Location&amp;action=history -->

# Location(object, vector, float)
Set the value of a Location data structure. 
location Location( object oArea, vector vPosition, float fOrientation);
### Parameters 

oArea
    An Area within the game module 

vPosition
    An object specifying an xyz coordinate 

fOrientation
    An angular value between 0.0 and 360.0
### Description
This function is a location constructor. A constructor is a special type of function whose purpose is to create a new instance of its type. A constructor is also where any special construction actions or initialization takes place. Its return type is a new object of the specified type, so in this case what we get back is a new object of type location. 
In order to construct a new location object the script needs three things: 
  1. The area the location is referenced in (this is the Area of the Module).
  2. A new vector containing the x, y and z coordinates of this location.
  3. A float representing the facing of the object from 0.0 to 360.0 where 0.0 = East, 90.0 = North, 180.0 = West, and 270.0 = South.

### Remarks
Object creation is often one of the most expensive operations, in terms of CPU usage, that can be performed. The rule of thumb is "Create as many objects as you need, but no more". 
### Version
1.62 
### Example
// Locate the area we are inobject oArea = GetArea(OBJECT_SELF);// Locate where in the are we arevector vPosition = GetPosition(OBJECT_SELF);// Identify the direction we are facingfloat fOrientation = GetFacing(OBJECT_SELF);// Create a new location with this informationlocation myLocation = Location(oArea, vPosition, fOrientation);
### See Also
functions:  | Vector
