// locationTypes.ts

export type City = {
  id: number;
  name: string;
};

export type State = {
  id: number;
  name: string;
  iso2: string | null;
  latitude: string;
  longitude: string;
  type: string;
  cities: City[];
};

export type Country = {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  numeric_code: string;
  phone_code: string;
  capital: string;
  currency: string;
  currency_name: string;
  currency_symbol: string;
  tld: string;
  native: string;
  region: string;
  region_id: number;
  subregion: string;
  subregion_id: number;
  timezones: any[];
  translations: any;
  latitude: string;
  longitude: string;
  emoji: string;
  emojiU: string;
  states: State[];
};
