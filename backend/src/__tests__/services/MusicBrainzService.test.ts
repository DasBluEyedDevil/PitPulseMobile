import axios from 'axios';
import Database from '../../config/database';
import { MusicBrainzService } from '../../services/MusicBrainzService';
import { getCache, setCache } from '../../utils/cache';

jest.mock('axios');
jest.mock('../../config/database');
jest.mock('../../utils/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));
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
const getCacheMock = getCache as jest.MockedFunction<typeof getCache>;
const setCacheMock = setCache as jest.MockedFunction<typeof setCache>;
const db = { query: jest.fn() };
const get = jest.fn();

(Database.getInstance as jest.Mock).mockReturnValue(db);

const artist = {
  id: 'artist-mbid-1',
  name: 'The Tests',
  type: 'Group',
  disambiguation: 'Boston test band',
  country: 'US',
  area: { name: 'Boston' },
  'life-span': { begin: '2018-04-01' },
  tags: [
    { count: 5, name: 'indie rock' },
    { count: 12, name: 'punk' },
  ],
};

describe('MusicBrainzService provider contracts', () => {
  const originalUserAgent = process.env.MUSICBRAINZ_USER_AGENT;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockReset();
    db.query.mockReset();
    getCacheMock.mockResolvedValue(null);
    setCacheMock.mockResolvedValue(undefined);
    axiosMock.create.mockReturnValue({ get } as any);
    process.env.MUSICBRAINZ_USER_AGENT = 'SoundCheck-Test/1.0';
  });

  afterAll(() => {
    if (originalUserAgent === undefined) {
      delete process.env.MUSICBRAINZ_USER_AGENT;
    } else {
      process.env.MUSICBRAINZ_USER_AGENT = originalUserAgent;
    }
  });

  it('configures the required provider user agent', () => {
    new MusicBrainzService();

    expect(axiosMock.create).toHaveBeenCalledWith({
      baseURL: 'https://musicbrainz.org/ws/2',
      headers: {
        'User-Agent': 'SoundCheck-Test/1.0',
        Accept: 'application/json',
      },
    });
  });

  it('returns normalized artist cache hits without calling the provider', async () => {
    getCacheMock.mockResolvedValueOnce([artist] as any);
    const service = new MusicBrainzService();

    await expect(service.searchArtists('  The   Tests ')).resolves.toEqual([artist]);

    expect(getCacheMock).toHaveBeenCalledWith('mb:artist:search:the tests');
    expect(get).not.toHaveBeenCalled();
  });

  it('searches and caches artists using the canonical provider query', async () => {
    get.mockResolvedValue({ data: { artists: [artist] } });
    const service = new MusicBrainzService();

    await expect(service.searchArtists('The Tests', 12)).resolves.toEqual([artist]);

    expect(get).toHaveBeenCalledWith('/artist', {
      params: { query: 'The Tests', limit: 12, fmt: 'json' },
    });
    expect(setCacheMock).toHaveBeenCalledWith('mb:artist:search:the tests', [artist], 86400);
  });

  it('keeps provider success observable through cache failures', async () => {
    getCacheMock.mockRejectedValueOnce(new Error('cache read failed'));
    get.mockResolvedValue({ data: {} });
    setCacheMock.mockRejectedValueOnce(new Error('cache write failed'));
    const service = new MusicBrainzService();

    await expect(service.searchArtists('Nobody')).resolves.toEqual([]);
  });

  it('fetches artist details and genre searches with stable contracts', async () => {
    get
      .mockResolvedValueOnce({ data: artist })
      .mockResolvedValueOnce({ data: { artists: [artist] } });
    const service = new MusicBrainzService();

    await expect(service.getArtistDetails('artist-mbid-1')).resolves.toEqual(artist);
    await expect(service.searchByGenre('Punk', 8)).resolves.toEqual([artist]);

    expect(get).toHaveBeenNthCalledWith(1, '/artist/artist-mbid-1', {
      params: { inc: 'tags+ratings', fmt: 'json' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/artist', {
      params: { query: 'tag:Punk', limit: 8, fmt: 'json' },
    });
    expect(setCacheMock).toHaveBeenCalledWith('mb:artist:artist-mbid-1', artist, 86400);
    expect(setCacheMock).toHaveBeenCalledWith('mb:genre:punk', [artist], 21600);
  });

  it.each([
    ['search', () => new MusicBrainzService().searchArtists('Tests'), 'Failed to search artists'],
    [
      'details',
      () => new MusicBrainzService().getArtistDetails('artist-mbid-1'),
      'Failed to get artist details',
    ],
    [
      'genre',
      () => new MusicBrainzService().searchByGenre('punk'),
      'Failed to search artists by genre',
    ],
  ])('wraps %s provider failures with a stable domain error', async (_name, invoke, message) => {
    get.mockRejectedValueOnce(new Error('provider timeout'));

    await expect(invoke()).rejects.toThrow(message);
  });

  it('returns an existing imported band with mapped domain fields', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'band-1',
          name: 'Existing Tests',
          average_rating: '4.25',
          total_checkins: '19',
          is_active: true,
          musicbrainz_id: 'artist-mbid-1',
          source: 'musicbrainz',
        },
      ],
    });
    const service = new MusicBrainzService();

    await expect(service.importBand('artist-mbid-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'band-1',
        name: 'Existing Tests',
        averageRating: 4.25,
        totalRatings: 19,
        alreadyExists: true,
      })
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('imports a provider artist using top genre and normalized profile fields', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'band-2',
          name: 'The Tests',
          description: 'The Tests is a Group (Boston test band) in the Punk genre.',
          genre: 'Punk',
          formed_year: 2018,
          hometown: 'Boston, US',
          average_rating: '0',
          total_checkins: '0',
          musicbrainz_id: 'artist-mbid-1',
          source: 'musicbrainz',
        },
      ],
    });
    const service = new MusicBrainzService();
    jest.spyOn(service, 'getArtistDetails').mockResolvedValue(artist as any);

    await expect(service.importBand('artist-mbid-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'band-2',
        genre: 'Punk',
        formedYear: 2018,
        hometown: 'Boston, US',
        alreadyExists: false,
      })
    );
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO bands'), [
      'The Tests',
      'The Tests is a Group (Boston test band) in the Punk genre.',
      'Punk',
      2018,
      'Boston, US',
      'artist-mbid-1',
      'musicbrainz',
    ]);
  });

  it('imports sparse provider artists with safe fallback fields', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'band-3',
          name: 'Solo Test',
          description: 'Solo Test is a musical artist.',
          genre: 'Unknown',
          average_rating: null,
          total_checkins: null,
          musicbrainz_id: 'artist-mbid-2',
        },
      ],
    });
    const service = new MusicBrainzService();
    jest.spyOn(service, 'getArtistDetails').mockResolvedValue({
      id: 'artist-mbid-2',
      name: 'Solo Test',
    } as any);

    await expect(service.importBand('artist-mbid-2')).resolves.toEqual(
      expect.objectContaining({
        genre: 'Unknown',
        averageRating: 0,
        totalRatings: 0,
        alreadyExists: false,
      })
    );
  });

  it('propagates import database failures for retry and diagnosis', async () => {
    const failure = new Error('database unavailable');
    db.query.mockRejectedValueOnce(failure);
    const service = new MusicBrainzService();

    await expect(service.importBand('artist-mbid-1')).rejects.toBe(failure);
  });
});
