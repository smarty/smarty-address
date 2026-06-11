export const miscStyles = {
	".smartyAddress__typography_default": {
		"--smartyAddress__fontSizeSmall1": ".65em",
		"--smartyAddress__chevronHeight": "0.375em",
		"--smartyAddress__entriesGap": "0.3em",
	},

	".smartyAddress__position_default": {
		"--smartyAddress__dropdownWidth": "100%",
		"--smartyAddress__dropdownPositionTop": "0",
		"--smartyAddress__dropdownPositionLeft": "0",
	},

	// Self-contained var block carried by verification surfaces directly (badge /
	// panel / chooser sit outside the dropdown wrapper, so they can't inherit the
	// theme classes' vars). Raw values live here; theme.ts consumes only vars.
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
	},
};
