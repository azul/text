(window.textWebpackJsonp=window.textWebpackJsonp||[]).push([[37],{222:function(e,n){e.exports=function(e){var n={keyword:"abstract as base bool break byte case catch char checked const continue decimal default delegate do double enum event explicit extern finally fixed float for foreach goto if implicit in int interface internal is lock long object operator out override params private protected public readonly ref sbyte sealed short sizeof stackalloc static string struct switch this try typeof uint ulong unchecked unsafe ushort using virtual void volatile while add alias ascending async await by descending dynamic equals from get global group into join let nameof on orderby partial remove select set value var when where yield",literal:"null false true"},i={className:"number",variants:[{begin:"\\b(0b[01']+)"},{begin:"(-?)\\b([\\d']+(\\.[\\d']*)?|\\.[\\d']+)(u|U|l|L|ul|UL|f|F|b|B)"},{begin:"(-?)(\\b0[xX][a-fA-F0-9']+|(\\b[\\d']+(\\.[\\d']*)?|\\.[\\d']+)([eE][-+]?[\\d']+)?)"}],relevance:0},a={className:"string",begin:'@"',end:'"',contains:[{begin:'""'}]},s=e.inherit(a,{illegal:/\n/}),t={className:"subst",begin:"{",end:"}",keywords:n},l=e.inherit(t,{illegal:/\n/}),r={className:"string",begin:/\$"/,end:'"',illegal:/\n/,contains:[{begin:"{{"},{begin:"}}"},e.BACKSLASH_ESCAPE,l]},c={className:"string",begin:/\$@"/,end:'"',contains:[{begin:"{{"},{begin:"}}"},{begin:'""'},t]},o=e.inherit(c,{illegal:/\n/,contains:[{begin:"{{"},{begin:"}}"},{begin:'""'},l]});t.contains=[c,r,a,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,i,e.C_BLOCK_COMMENT_MODE],l.contains=[o,r,s,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,i,e.inherit(e.C_BLOCK_COMMENT_MODE,{illegal:/\n/})];var d={variants:[c,r,a,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},g=e.IDENT_RE+"(<"+e.IDENT_RE+"(\\s*,\\s*"+e.IDENT_RE+")*>)?(\\[\\])?";return{aliases:["csharp","c#"],keywords:n,illegal:/::/,contains:[e.COMMENT("///","$",{returnBegin:!0,contains:[{className:"doctag",variants:[{begin:"///",relevance:0},{begin:"\x3c!--|--\x3e"},{begin:"</?",end:">"}]}]}),e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,{className:"meta",begin:"#",end:"$",keywords:{"meta-keyword":"if else elif endif define undef warning error line region endregion pragma checksum"}},d,i,{beginKeywords:"class interface",end:/[{;=]/,illegal:/[^\s:,]/,contains:[e.TITLE_MODE,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{beginKeywords:"namespace",end:/[{;=]/,illegal:/[^\s:]/,contains:[e.inherit(e.TITLE_MODE,{begin:"[a-zA-Z](\\.?\\w)*"}),e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{className:"meta",begin:"^\\s*\\[",excludeBegin:!0,end:"\\]",excludeEnd:!0,contains:[{className:"meta-string",begin:/"/,end:/"/}]},{beginKeywords:"new return throw await else",relevance:0},{className:"function",begin:"("+g+"\\s+)+"+e.IDENT_RE+"\\s*\\(",returnBegin:!0,end:/\s*[{;=]/,excludeEnd:!0,keywords:n,contains:[{begin:e.IDENT_RE+"\\s*\\(",returnBegin:!0,contains:[e.TITLE_MODE],relevance:0},{className:"params",begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:n,relevance:0,contains:[d,i,e.C_BLOCK_COMMENT_MODE]},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]}]}}}}]);
//# sourceMappingURL=cs.js.map?v=cb1770c397dabdcbcd24