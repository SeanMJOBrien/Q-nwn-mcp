<!-- Source: https://nwnlexicon.com/index.php/SetCustomToken -->

# SetCustomToken(int, string)
Sets the value for a custom token. 
void SetCustomToken( int nCustomTokenNumber, string sTokenValue);
### Parameters 

nCustomTokenNumber
    The number of the custom token. 

sTokenValue
    The string value for the custom token.
### Description
Sets the value for a custom token to be used in a conversation. 
You can set the custom tokens in any script, however you may consider setting the tokens in  StartingConditional() type scripts used in Conversation Conditional Script events to keep things contained. 
The Lexicon has hitherto erroneously stated that tokens are local to conversations. This is NOT the case. Tokens are global, so when you set a token in a script (e.g. in a conversation file), it will have an effect on all instances of that token's use. Thus, using the same token number for different things in different conversation files can cause problems in multiplayer games especially, and should be avoided. If you need to make sure to set them in the Conversation Conditional Script on the node that has the token in use. 
### Remarks
Custom tokens 0-9 are used by BioWare and should not be used. Maximum token number is 2,147,483,647. 
There is a risk if you reuse components that they will have scripts that set the same custom tokens as you set. To avoid this, set your custom tokens right before your conversations (do not create new tokens within a conversation, create them all at the beginning of the conversation). 
To use a custom token, place <CUSTOMxxxx> somewhere in your conversation, where xxxx is the value supplied for nCustomTokenNumber. <CUSTOM100> for example. 
SetCustomToken() can also be used to give a name to some placeables, although not creatures or map notes. 
For completeness it goes roughly as follows: 
In the module OnLoad event place the command: 
SetCustomToken(501, "Bill's Brazier");
And in the name of the Brazier put: 
```
<CUSTOM501>

```

The call to SetCustomToken() could go anywhere provided it was executed before the object was created. 
Note that, for placeable names, any player in the same area as the placeable whose name is updated using SetCustomToken() will not see the name change. They'd have to leave the area and reenter before the name gets updated for them. SetName() is likely a better option for these instances. 
You can also use tokens in journal entries. 
All objects which share the same blueprint number have their token value updated when this function is called. 
### Example
// The custom token created here can be used in// a conversation by typing <CUSTOM100>int StartingConditional(){ SetCustomToken(100, GetName(GetPCSpeaker())); return TRUE;}
### See Also
tutorials:  | Custom Tokens
