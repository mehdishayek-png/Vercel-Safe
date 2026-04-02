// Lazy-loaded country-state-city — avoids shipping 7.7MB JSON to the client bundle.
// All functions are async now (dynamic import on first call, cached after).

let _Country, _State, _City;

async function load() {
    if (!_Country) {
        const mod = await import('country-state-city');
        _Country = mod.Country;
        _State = mod.State;
        _City = mod.City;
    }
    return { Country: _Country, State: _State, City: _City };
}

export async function getAllCountries() {
    const { Country } = await load();
    return Country.getAllCountries().map(country => ({
        label: country.name,
        value: country.isoCode,
        flag: country.flag
    }));
}

export async function getStatesByCountry(countryCode) {
    if (!countryCode) return [];
    const { State } = await load();
    return State.getStatesOfCountry(countryCode).map(state => ({
        label: state.name,
        value: state.isoCode,
        countryCode: countryCode
    }));
}

export async function getCitiesByState(countryCode, stateCode) {
    if (!countryCode) return [];
    const { City } = await load();

    let cities = [];
    if (stateCode) {
        cities = City.getCitiesOfState(countryCode, stateCode);
    } else {
        cities = City.getCitiesOfCountry(countryCode);
    }

    const mappedCities = cities.slice(0, 500).map(city => {
        let name = city.name;
        if (countryCode === 'IN') {
            if (name === 'Bangalore Urban' || name === 'Bengaluru Urban') name = 'Bengaluru';
            if (name === 'New Delhi') name = 'Delhi';
        }
        return { label: name, value: name };
    });

    const uniqueMap = new Map();
    for (const city of mappedCities) {
        if (!uniqueMap.has(city.value)) uniqueMap.set(city.value, city);
    }
    return Array.from(uniqueMap.values());
}

export async function getCitiesByCountry(countryCode) {
    if (!countryCode) return [];
    const { City } = await load();
    return City.getCitiesOfCountry(countryCode).slice(0, 500).map(city => ({
        label: city.name,
        value: city.name
    }));
}

export async function getCountryName(code) {
    const { Country } = await load();
    const country = Country.getCountryByCode(code);
    return country ? country.name : code;
}

export async function getStateName(countryCode, stateCode) {
    const { State } = await load();
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    return state ? state.name : stateCode;
}
