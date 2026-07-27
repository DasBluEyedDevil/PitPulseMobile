import axios from 'axios';
import Database from '../../config/database';
import { FoursquareService } from '../../services/FoursquareService';

jest.mock('axios');
jest.mock('../../config/database');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const axiosMock = axios as jest.Mocked<typeof axios>;
const db = { query: jest.fn() };
const get = jest.fn();
(Database.getInstance as jest.Mock).mockReturnValue(db);

const venue = {
  fsq_id: 'place-1',
  name: 'Test Arena',
  location: {
    address: '1 Test Way',
    locality: 'Boston',
    region: 'MA',
    postcode: '02108',
    country: 'US',
  },
  geocodes: {
    main: { latitude: 42.36, longitude: -71.06 },
  },
  categories: [{ id: 1, name: 'Concert Arena' }],
  photos: [
    {
      id: 'photo-1',
      prefix: 'https://images.example/',
      suffix: '.jpg',
      width: 1200,
      height: 800,
    },
  ],
};

describe('FoursquareService provider contracts', () => {
  const originalApiKey = process.env.FOURSQUARE_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockReset();
    db.query.mockReset();
    axiosMock.create.mockReturnValue({ get } as any);
    process.env.FOURSQUARE_API_KEY = 'foursquare-test-key';
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.FOURSQUARE_API_KEY;
    } else {
      process.env.FOURSQUARE_API_KEY = originalApiKey;
    }
  });

  it('degrades searches and rejects details/import when disabled', async () => {
    delete process.env.FOURSQUARE_API_KEY;
    const service = new FoursquareService();

    await expect(service.searchVenues('Hall')).resolves.toEqual([]);
    await expect(service.searchNearbyVenues(42.36, -71.06)).resolves.toEqual([]);
    await expect(service.getVenueDetails('place-1')).rejects.toThrow(
      'Foursquare integration is disabled'
    );
    await expect(service.importVenue('place-1')).rejects.toThrow(
      'Foursquare integration is disabled'
    );
  });

  it('configures the current Places API authentication contract', () => {
    new FoursquareService();

    expect(axiosMock.create).toHaveBeenCalledWith({
      baseURL: 'https://places-api.foursquare.com',
      headers: {
        Authorization: 'Bearer foursquare-test-key',
        Accept: 'application/json',
        'X-Places-Api-Version': '2025-11-14',
      },
    });
  });

  it('searches by query and optional coordinates', async () => {
    get.mockResolvedValue({ data: { results: [venue] } });
    const service = new FoursquareService();

    await expect(
      service.searchVenues('Test Arena', { lat: 42.36, lng: -71.06 }, 8)
    ).resolves.toEqual([venue]);

    expect(get).toHaveBeenCalledWith('/places/search', {
      params: {
        query: 'Test Arena',
        limit: 8,
        categories: '10000,17000',
        ll: '42.36,-71.06',
      },
    });
  });

  it('returns an empty search list when the provider omits results', async () => {
    get.mockResolvedValue({ data: {} });
    const service = new FoursquareService();

    await expect(service.searchVenues('Nobody')).resolves.toEqual([]);
  });

  it('fetches details and nearby venues with canonical fields', async () => {
    get
      .mockResolvedValueOnce({ data: venue })
      .mockResolvedValueOnce({ data: { results: [venue] } });
    const service = new FoursquareService();

    await expect(service.getVenueDetails('place-1')).resolves.toEqual(venue);
    await expect(service.searchNearbyVenues(42.36, -71.06, 1000, 5)).resolves.toEqual([venue]);

    expect(get).toHaveBeenNthCalledWith(1, '/places/place-1', {
      params: {
        fields: 'fsq_id,name,location,geocodes,categories,photos',
      },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/places/nearby', {
      params: {
        ll: '42.36,-71.06',
        radius: 1000,
        limit: 5,
        categories: '10000,17000',
      },
    });
  });

  it.each([
    ['search', () => new FoursquareService().searchVenues('Tests'), 'Failed to search venues'],
    [
      'details',
      () => new FoursquareService().getVenueDetails('place-1'),
      'Failed to get venue details',
    ],
    [
      'nearby',
      () => new FoursquareService().searchNearbyVenues(42.36, -71.06),
      'Failed to search nearby venues',
    ],
  ])('wraps %s provider failures with a stable domain error', async (_name, invoke, message) => {
    get.mockRejectedValueOnce(new Error('provider timeout'));

    await expect(invoke()).rejects.toThrow(message);
  });

  it('returns an existing imported venue with mapped domain fields', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'venue-1',
          name: 'Existing Hall',
          latitude: '42.3601',
          longitude: '-71.0589',
          average_rating: '4.2',
          total_checkins: '9',
          is_active: true,
          foursquare_place_id: 'place-1',
          source: 'foursquare',
        },
      ],
    });
    const service = new FoursquareService();

    await expect(service.importVenue('place-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'venue-1',
        latitude: 42.3601,
        longitude: -71.0589,
        averageRating: 4.2,
        totalRatings: 9,
        alreadyExists: true,
      })
    );
  });

  it('imports venue details with category type and original photo URL', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'venue-2',
          name: 'Test Arena',
          address: '1 Test Way',
          city: 'Boston',
          state: 'MA',
          country: 'US',
          postal_code: '02108',
          latitude: '42.36',
          longitude: '-71.06',
          venue_type: 'arena',
          image_url: 'https://images.example/original.jpg',
          foursquare_place_id: 'place-1',
          source: 'foursquare',
        },
      ],
    });
    const service = new FoursquareService();
    jest.spyOn(service, 'getVenueDetails').mockResolvedValue(venue as any);

    await expect(service.importVenue('place-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'venue-2',
        venueType: 'arena',
        imageUrl: 'https://images.example/original.jpg',
        alreadyExists: false,
      })
    );
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO venues'), [
      'Test Arena',
      '1 Test Way',
      'Boston',
      'MA',
      'US',
      '02108',
      42.36,
      -71.06,
      'arena',
      'https://images.example/original.jpg',
      'place-1',
      'foursquare',
    ]);
  });

  it.each([
    ['Live Music Venue', 'club'],
    ['Concert Theater', 'concert_hall'],
    ['Outdoor Amphitheater', 'outdoor'],
    ['Night Club', 'club'],
  ])('maps %s to the %s venue type', async (categoryName, expectedType) => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'venue-category',
          name: 'Category Hall',
          venue_type: expectedType,
          foursquare_place_id: 'category-place',
        },
      ],
    });
    const service = new FoursquareService();
    jest.spyOn(service, 'getVenueDetails').mockResolvedValue({
      ...venue,
      categories: [{ id: 2, name: categoryName }],
      photos: [],
    } as any);

    await service.importVenue('category-place');

    expect(db.query.mock.calls[1][1][8]).toBe(expectedType);
    expect(db.query.mock.calls[1][1][9]).toBeNull();
  });

  it('propagates import failures for retry and diagnosis', async () => {
    const failure = new Error('database unavailable');
    db.query.mockRejectedValueOnce(failure);
    const service = new FoursquareService();

    await expect(service.importVenue('place-1')).rejects.toBe(failure);
  });
});
