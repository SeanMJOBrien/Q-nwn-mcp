<!-- Source: https://nwnlexicon.com/index.php/GetItemCharges -->

# GetItemCharges(object)
Retrieves the number of charges remaining on a given item. 
int GetItemCharges( object oItem);
#### Parameters 

oItem
    Object to query the number of charges remaining of.
#### Description
Returns the number of charges remaining on a given item. Returns 0 if the item is not an item, an invalid object, or has no charges. 
Note that SetItemCharges can set an amount of charges regardless of if an item has usable item properties to go along with it (it also appears in the Examine panel which may be useful). 
#### Version
1.30 
#### See Also
functions:  |  SetItemCharges
