import { AddressSuggestion } from "../interfaces";

// TODO: Replace all the comments with more descriptive variable names
// Address at 123 Main St, Apt 1, Springfield IL
export const mainStreetApt1: AddressSuggestion = {
	street_line: "123 Main St",
	secondary: "Apt 1",
	entries: 5,
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};

// Address at 456 Oak Ave, Unit 2, Springfield IL
export const oakAveUnit2: AddressSuggestion = {
	street_line: "456 Oak Ave",
	secondary: "Unit 2",
	entries: 3,
	city: "Springfield",
	state: "IL",
	zipcode: "62702",
	country: "US",
};

// Address at 789 Elm St, Suite 3, Springfield IL (used for no-match scenarios)
export const elmStSuite3: AddressSuggestion = {
	street_line: "789 Elm St",
	secondary: "Suite 3",
	entries: 2,
	city: "Springfield",
	state: "IL",
	zipcode: "62703",
	country: "US",
};

// Address with extended secondary info (contains "Apt 1 (5 entries)")
export const mainStreetApt1Extended: AddressSuggestion = {
	street_line: "123 Main St",
	secondary: "Apt 1 (5 entries)",
	entries: 5,
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};

// Address with extra whitespace in street_line
export const mainStreetApt1WithWhitespace: AddressSuggestion = {
	street_line: "  123 Main St  ",
	secondary: "Apt 1",
	entries: 5,
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};

// Basic address without secondary info (for API response tests)
export const mainStreetBasic: AddressSuggestion = {
	street_line: "123 Main St",
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};
