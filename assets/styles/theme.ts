export const themeStyles = {
".smartyAddress__suggestionsWrapperElement": {
    "top": "var(--smartyAddress__dropdownPositionTop)",
    "left": "var(--smartyAddress__dropdownPositionLeft)",
    "position": "var(--smartyAddress__wrapperPosition)",
    "z-index": "var(--smartyAddress__dropdownZIndex)",
    "font-weight": "var(--smartyAddress__dropdownFontWeight)",
},

".smartyAddress__hidden": {
    "display": "var(--smartyAddress__hiddenDisplay)",
},

".smartyAddress__dropdownElement": {
    "position": "var(--smartyAddress__dropdownPosition)",
    "box-sizing": "var(--smartyAddress__dropdownBoxSizing)",
    "width": "var(--smartyAddress__dropdownWidth)",
    "box-shadow": "var(--smartyAddress__largeShadow1), var(--smartyAddress__largeShadow2)",
    "color": "var(--smartyAddress__textBasePrimaryColor)",
    "background-color": "var(--smartyAddress__surfaceBasePrimaryColor)",
    // TODO: This border color is too much contrast for light mode, and too little contrast for dark mode
    "border": "1px solid var(--smartyAddress__surfaceBaseSecondaryColor)",
    "border-top": "none",
},

".smartyAddress__suggestionsElement": {
    "margin": "var(--smartyAddress__spacingNone)",
    "padding": "var(--smartyAddress__spacingNone)",
    "overflow-y": "var(--smartyAddress__dropdownOverflowY)",
    "max-height": "var(--smartyAddress__heightLarge1)",
    "scrollbar-color": "var(--smartyAddress__surfaceBaseTertiaryColor) var(--smartyAddress__surfaceBasePrimaryColor)", // TODO: Make sure we didn't break this line
    "scrollbar-width": "var(--smartyAddress__scrollbarWidth)",
},

".smartyAddress__suggestion": {
    "cursor": "var(--smartyAddress__cursorStyle)",
    "padding": "var(--smartyAddress__spacingMedium3)",
    "color": "var(--smartyAddress__textBasePrimaryColor)",
    "background-color": "var(--smartyAddress__surfaceBasePrimaryColor)",
    "display": "var(--smartyAddress__suggestionDisplay)",
    "justify-content": "var(--smartyAddress__suggestionJustifyContent)",
},

".smartyAddress__suggestion:hover, .smartyAddress__suggestion[aria-selected='true']": {
    "background-color": "var(--smartyAddress__surfaceBaseSecondaryColor)",
},

".smartyAddress__autocompleteAddress": {
    "white-space": "var(--smartyAddress__suggestionWhitespace)",
    "text-overflow": "var(--smartyAddress__suggestionOverflow)",
    "overflow-x": "var(--smartyAddress__suggestionOverflowX)",
},

".smartyAddress__suggestionEntries": {
    // TODO: Figure out fallback colors (or we could just make sure we never run into that scenario)
    "color": "var(--smartyAddress__textAccentColor, #0066ff)",
    "white-space": "var(--smartyAddress__suggestionWhitespace)",
},

".smartyAddress__poweredBy": {
    "color": "var(--smartyAddress__textBaseSecondaryColor)",
    "margin": "var(--smartyAddress__spacingNone)",
    "padding": "var(--smartyAddress__spacingMedium3)",
    "display": "var(--smartyAddress__poweredByDisplay)",
    "align-items": "var(--smartyAddress__poweredByAlignItems)",
    "justify-content": "var(--smartyAddress__poweredByJustifyContent)",
    "font-size": "var(--smartyAddress__fontSizeSmall1)",
    "gap": "var(--smartyAddress__spacingSmall3)",
    "text-transform": "var(--smartyAddress__poweredByTextTransform)",
},

".smartyAddress__smartyLogoDark, .smartyAddress__smartyLogoLight": {
    "height": "var(--smartyAddress__poweredByLogoHeight)",
},

".smartyAddress__smartyLogoDark": {
    "display": "var(--smartyAddress__logoDarkDisplay)",
},

".smartyAddress__smartyLogoLight": {
    "display": "var(--smartyAddress__logoLightDisplay)",
}
};