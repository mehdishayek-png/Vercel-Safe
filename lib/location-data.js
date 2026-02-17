import { Country, State, City } from 'country-state-city';

// Get formatted countries
export function getAllCountries() {
    return Country.getAllCountries().map(country => ({
        label: country.name,
        value: country.isoCode,
        flag: country.flag
    }));
}

// Get states for a country
export function getStatesByCountry(countryCode) {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map(state => ({
        label: state.name,
        value: state.isoCode,
        countryCode: countryCode
    }));
}

// Get cities for a state (or country if no state provided, though State is preferred)
export function getCitiesByState(countryCode, stateCode) {
    if (!countryCode) return [];

    let cities = [];
    if (stateCode) {
        cities = City.getCitiesOfState(countryCode, stateCode);
    } else {
        // Fallback: This can be huge, careful
        cities = City.getCitiesOfCountry(countryCode);
    }

    // Limit to 500 to prevent browser crash if filtering isn't enough
    return cities.slice(0, 500).map(city => {
        let name = city.name;
        // Clean up Indian city names
        if (countryCode === 'IN') {
            if (name === 'Bangalore Urban' || name === 'Bengaluru Urban') name = 'Bengaluru';
            if (name === 'New Delhi') name = 'Delhi';
            // Remove "District" suffix locally if desired, though usually specificity helps
            // But for Bangalore specifically, "Urban" is noise.
        }
        return {
            label: name,
            value: name
        };
    });
}

// Use this for global city search if needed, but not recommended due to size
export function getCitiesByCountry(countryCode) {
    if (!countryCode) return [];
    return City.getCitiesOfCountry(countryCode).slice(0, 500).map(city => ({
        label: city.name,
        value: city.name
    }));
}

export function getCountryName(code) {
    const country = Country.getCountryByCode(code);
    return country ? country.name : code;
}

export function getStateName(countryCode, stateCode) {
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    return state ? state.name : stateCode;
}
