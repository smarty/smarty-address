
Centralize CSS Class Names
------


There's a TODO in the code for this. Class names like "smartyAddress__hidden" are scattered throughout. Create a constants file:
export const CSS_CLASSES = {
hidden: 'smartyAddress__hidden',
matchedText: 'smartyAddress__matchedText',
// ...
} as const;

Medium Priority

