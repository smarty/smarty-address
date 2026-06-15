export const baseStyles = {
	".smartyAddress__base_default": {
		"--smartyAddress__wrapperPosition": "absolute",
		"--smartyAddress__hiddenDisplay": "none",
		"--smartyAddress__dropdownPosition": "relative",
		"--smartyAddress__cursorStyle": "pointer",
		"--smartyAddress__dropdownBoxSizing": "border-box",
		"--smartyAddress__dropdownZIndex": "1000",
		"--smartyAddress__dropdownFontWeight": "normal",
		"--smartyAddress__dropdownOverflowY": "auto",
		"--smartyAddress__suggestionDisplay": "flex",
		"--smartyAddress__suggestionJustifyContent": "space-between",
		"--smartyAddress__poweredByDisplay": "flex",
		"--smartyAddress__poweredByAlignItems": "center",
		"--smartyAddress__poweredByJustifyContent": "flex-end",
		"--smartyAddress__poweredByTextTransform": "uppercase",
		// TODO: Should the logo height be made independent from the "powered by" font-size?
		"--smartyAddress__poweredByLogoHeight": "2.2em",
		"--smartyAddress__suggestionWhitespace": "nowrap",
		"--smartyAddress__suggestionOverflow": "ellipsis",
		"--smartyAddress__suggestionOverflowX": "hidden",
		"--smartyAddress__entriesDisplay": "flex",
		"--smartyAddress__entriesAlignItems": "center",
		"--smartyAddress__chevronTransition": "transform 0.2s ease",
		"--smartyAddress__chevronRotation": "rotate(0deg)",
		"--smartyAddress__chevronRotationExpanded": "rotate(180deg)",
	},

	// Fallback values for every verification variable. Verify surfaces sit
	// outside the dropdown wrapper, so they carry this class plus the configured
	// theme classes directly; theme blocks (colors.ts) override the palette vars
	// because baseStyles is spread first in defineStyles.
	".smartyAddress__verify_default": {
		"--smartyAddress__verifyBadgeDisplay": "inline-flex",
		"--smartyAddress__verifyBadgeAlignItems": "center",
		"--smartyAddress__verifyBadgeGap": "5px",
		"--smartyAddress__verifyBadgePadding": "2px 8px",
		"--smartyAddress__verifyBadgeFontSize": ".8em",
		"--smartyAddress__verifyBadgeFontWeight": "600",
		"--smartyAddress__verifyBadgeRadius": "4px",
		"--smartyAddress__verifyBadgeBg": "transparent",
		"--smartyAddress__verifyBadgeText": "#49505b",

		"--smartyAddress__verifyPositive": "#15803d",
		"--smartyAddress__verifyWarning": "#b45309",
		"--smartyAddress__verifyNegative": "#b91c1c",

		"--smartyAddress__verifyPanelDisplay": "block",
		"--smartyAddress__verifyPanelPadding": "12px",
		"--smartyAddress__verifyPanelGap": "8px",
		"--smartyAddress__verifyPanelRadius": "6px",
		"--smartyAddress__verifyPanelFontSize": ".9em",
		"--smartyAddress__verifyPanelBg": "#fcfcfc",
		"--smartyAddress__verifyPanelText": "#000",
		"--smartyAddress__verifyPanelBorder": "1px solid #ccc",
		"--smartyAddress__verifyPanelShadow":
			"0 12px 24px 0 rgba(4, 34, 75, 0.10), 0 20px 40px 0 rgba(21, 27, 35, 0.06)",

		"--smartyAddress__verifyChooserOptionDisplay": "block",
		"--smartyAddress__verifyChooserOptionWidth": "100%",
		"--smartyAddress__verifyChooserOptionTextAlign": "left",
	},
};
