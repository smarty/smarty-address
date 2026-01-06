import { AddressSuggestion } from "../interfaces";

export const completeAddressWithSecondary: AddressSuggestion = {
	street_line: "123 Main St",
	secondary: "Apt 1",
	entries: 5,
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};

export const completeAddressWithSecondaryAlternate: AddressSuggestion = {
	street_line: "456 Oak Ave",
	secondary: "Unit 2",
	entries: 3,
	city: "Springfield",
	state: "IL",
	zipcode: "62702",
	country: "US",
};

export const completeAddressWithSecondaryForNoMatch: AddressSuggestion = {
	street_line: "789 Elm St",
	secondary: "Suite 3",
	entries: 2,
	city: "Springfield",
	state: "IL",
	zipcode: "62703",
	country: "US",
};

export const completeAddressWithExtendedSecondary: AddressSuggestion = {
	street_line: "123 Main St",
	secondary: "Apt 1 (5 entries)",
	entries: 5,
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};

export const completeAddressWithExtraWhitespace: AddressSuggestion = {
	street_line: "  123 Main St  ",
	secondary: "Apt 1",
	entries: 5,
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};

export const basicAddressWithoutSecondary: AddressSuggestion = {
	street_line: "123 Main St",
	city: "Springfield",
	state: "IL",
	zipcode: "62701",
	country: "US",
};
