import { fetchWithTimeout } from "../tools";

const WEATHER_CODES: Record<number, string> = {
  0: "bezchmurnie",
  1: "przeważnie bezchmurnie",
  2: "częściowe zachmurzenie",
  3: "pochmurno",
  45: "mgła",
  48: "mgła z osadzającą się szadzią",
  51: "lekka mżawka",
  53: "umiarkowana mżawka",
  55: "gęsta mżawka",
  61: "lekki deszcz",
  63: "umiarkowany deszcz",
  65: "silny deszcz",
  71: "lekki śnieg",
  73: "umiarkowany śnieg",
  75: "silny śnieg",
  80: "przelotne opady deszczu",
  81: "umiarkowane przelotne opady deszczu",
  82: "silne przelotne opady deszczu",
  95: "burza",
  96: "burza z gradem",
  99: "silna burza z gradem",
};

type WeatherResult =
  | {
      city: string;
      country: string;
      temperature: number;
      description: string;
      wind: number;
      humidity: number;
    }
  | { error: string };

async function fetchWeather(city: string): Promise<WeatherResult> {
  try {
    const geoRes = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pl`,
    );
    if (!geoRes.ok) return { error: `API zwróciło błąd ${geoRes.status}.` };
    const geo = await geoRes.json();
    const place = geo.results?.[0];
    if (!place) return { error: `Nie znalazłem miasta "${city}".` };

    const weatherRes = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`,
    );
    if (!weatherRes.ok) return { error: `API zwróciło błąd ${weatherRes.status}.` };
    const weather = await weatherRes.json();
    const c = weather.current;
    return {
      city: place.name,
      country: place.country,
      temperature: c.temperature_2m,
      description: WEATHER_CODES[c.weather_code] ?? "nieznane warunki",
      wind: c.wind_speed_10m,
      humidity: c.relative_humidity_2m,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd połączenia z serwerem pogodowym." };
  }
}

type RateResult = { code: string; rate: number; date: string } | { code: string; error: string };

async function fetchRate(code: string): Promise<RateResult> {
  try {
    const res = await fetchWithTimeout(
      `https://api.frankfurter.dev/v1/latest?base=${code}&symbols=PLN`,
    );
    if (!res.ok) return { code, error: `API zwróciło błąd ${res.status}.` };
    const data = await res.json();
    const rate = data.rates?.PLN;
    if (!rate) return { code, error: "Brak kursu." };
    return { code, rate, date: data.date };
  } catch (err) {
    return { code, error: err instanceof Error ? err.message : "Błąd połączenia z serwerem kursów." };
  }
}

type Holiday = { date: string; name: string };

async function fetchUpcomingHolidays(country: string): Promise<Holiday[] | { error: string }> {
  const year = new Date().getFullYear();
  try {
    const res = await fetchWithTimeout(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
    );
    if (!res.ok) return { error: `API zwróciło błąd ${res.status}.` };
    const holidays: { date: string; localName: string }[] = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    return holidays
      .filter((h) => h.date >= today)
      .slice(0, 3)
      .map((h) => ({ date: h.date, name: h.localName }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd połączenia z serwerem świąt." };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "Warszawa";
  const currencies = (searchParams.get("currencies") || "EUR,USD")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  const [weather, rates, holidays] = await Promise.all([
    fetchWeather(city),
    Promise.all(currencies.map(fetchRate)),
    fetchUpcomingHolidays("PL"),
  ]);

  const now = new Date().toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "full",
    timeStyle: "short",
  });

  return Response.json({ weather, rates, holidays, now, fetchedAt: Date.now() });
}
