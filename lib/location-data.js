import { Country, City } from 'country-state-city';

// Get formatted countries for Combobox
export function getAllCountries() {
    return Country.getAllCountries().map(country => ({
        label: country.name,
        value: country.isoCode,
        flag: country.flag
    }));
}

// Get formatted cities for a specific country
export function getCitiesByCountry(countryCode) {
    if (!countryCode) return [];
    const cities = City.getCitiesOfCountry(countryCode);

    // Filter and format (remove duplicates if any, though library is usually good)
    // Limit to top 500 if too many to prevent UI lag, or just return all if efficient
    return cities.map(city => ({
        label: city.name,
        value: city.name, // We use name for the actual search/display
        stateCode: city.stateCode
    }));
}

// Helper to get exact country name from code
export function getCountryName(code) {
    const country = Country.getCountryByCode(code);
    return country ? country.name : code;
}
