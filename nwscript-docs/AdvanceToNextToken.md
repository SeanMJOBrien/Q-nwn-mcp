<!-- Source: https://nwnlexicon.com/index.php/AdvanceToNextToken -->

# AdvanceToNextToken(struct sStringTokenizer)
Advances the string tokenizer to the next token. 
struct sStringTokenizer AdvanceToNextToken( struct sStringTokenizer stTok);

### Parameters 

stTok
    The string tokenizer used to split up the string.
### Description
This function advances the string tokenizer stTok, which is used to split up the string, to the next token. 
It updates the internal state of stTok and returns the updated state. 
Note that in order to get any subsequent tokens, you must pass the UPDATED stTok to AdvanceToNextToken(). If you forget to pass the updated stTok to AdvanceToNextToken(), for instance by passing an "older" non-updated version to AdvanceToNextToken(), this function will always return the same "old" next token of the "older" non-updated stTok. 
You get the next token string from the updated stTok by calling GetNextToken(), supplying the updated stTok as argument. 
AdvanceToNextToken() should always be used in combination with HasMoreTokens(), which checks whether there actually are any more tokens remaining for the current state of stTok. 
### Remarks
Keep in mind that the functions in x0_i0_stringlib  are not very efficient. They do a lot of unnecessary string manipulations and string parameter passing; string operations and string parameter passing (into or out of NWScript functions) are among the most inefficient operations in NWScript. 
For the purpose of string tokenization by the functions provided in x0_i0_stringlib, a token is any substring (including empty substrings!) within the original string enclosed by the specified delimiter (e.g. every token has one delimiter to the left, one to the right and NO delimiters within). Any non-empty original string is treated as if enclosed within a pair of (virtual) delimiters to its left and right. Thus, unless the original string is empty, the number of tokens is always one higher than the number of delimiters contained within the original string. A non-empty string with no delimiters, therefore, consists of one token, which is equal to the original string. An empty string has no tokens, although an empty token will be returned on request. 
##### Example:
sString = "I|am|sloppy||programmer";sDelimiter = "|";Token(0) | = "I";Token(1) = "am";Token(2) | = "sloppy";Token(3) = "";Token(4) | = "programmer";
sString contains five tokens and four delimiters. 
### Requirements
#include "x0_i0_stringlib" 
### Version
??? 
### Example
string sTag = "Some_Test_Stuff";// initialize the string tokenizer structure, delimited by an underscore.struct sStringTokenizer sTok = GetStringTokenizer(sTag, "_");// Loop over all the tokens.while(HasMoreTokens(sTok)) { // Call Advance before trying to get the next token sTok = AdvanceToNextToken(sTok); // Grab it token = GetNextToken(sTok); // Tokens can be zero length in the case of two adjacent delimiters // e.g "Testing_Tokenizer__Test" if (token != "") { // .... do something with token }}
### See Also
functions:  | GetStringTokenizer, GetNextToken, HasMoreTokens
