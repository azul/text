(window.textWebpackJsonp=window.textWebpackJsonp||[]).push([[73],{299:function(e,n){e.exports=function(e){var n={"builtin-name":"each in with if else unless bindattr action collection debugger log outlet template unbound view yield lookup"},a={begin:/".*?"|'.*?'|\[.*?\]|\w+/},t=e.inherit(a,{keywords:n,starts:{endsWithParent:!0,relevance:0,contains:[e.inherit(a,{relevance:0})]}}),i=e.inherit(t,{className:"name"}),s=e.inherit(t,{relevance:0});return{aliases:["hbs","html.hbs","html.handlebars"],case_insensitive:!0,subLanguage:"xml",contains:[{begin:/\\\{\{/,skip:!0},{begin:/\\\\(?=\{\{)/,skip:!0},e.COMMENT(/\{\{!--/,/--\}\}/),e.COMMENT(/\{\{!/,/\}\}/),{className:"template-tag",begin:/\{\{\{\{(?!\/)/,end:/\}\}\}\}/,contains:[i],starts:{end:/\{\{\{\{\//,returnEnd:!0,subLanguage:"xml"}},{className:"template-tag",begin:/\{\{\{\{\//,end:/\}\}\}\}/,contains:[i]},{className:"template-tag",begin:/\{\{[#\/]/,end:/\}\}/,contains:[i]},{className:"template-variable",begin:/\{\{\{/,end:/\}\}\}/,keywords:n,contains:[s]},{className:"template-variable",begin:/\{\{/,end:/\}\}/,keywords:n,contains:[s]}]}}}}]);
//# sourceMappingURL=handlebars.js.map?v=247e6e8379dbd0ce060d