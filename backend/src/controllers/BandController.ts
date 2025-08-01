import { Request, Response } from 'express';
import { BandService } from '../services/BandService';
import { CreateBandRequest, SearchQuery, ApiResponse } from '../types';

export class BandController {
  private bandService = new BandService();

  /**
   * Create a new band
   * POST /api/bands
   */
  createBand = async (req: Request, res: Response): Promise<void> => {
    try {
      const bandData: CreateBandRequest = req.body;

      // Validate required fields
      if (!bandData.name) {
        const response: ApiResponse = {
          success: false,
          error: 'Band name is required',
        };
        res.status(400).json(response);
        return;
      }

      const band = await this.bandService.createBand(bandData);

      const response: ApiResponse = {
        success: true,
        data: band,
        message: 'Band created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create band error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create band',
      };

      res.status(400).json(response);
    }
  };

  /**
   * Get all bands with search and filters
   * GET /api/bands
   */
  getBands = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchQuery: SearchQuery = {
        q: req.query.q as string,
        genre: req.query.genre as string,
        rating: req.query.rating ? parseFloat(req.query.rating as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sort: req.query.sort as string,
        order: req.query.order as 'asc' | 'desc',
      };

      const result = await this.bandService.searchBands(searchQuery);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get bands error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch bands',
      };

      res.status(500).json(response);
    }
  };

  /**
   * Get band by ID
   * GET /api/bands/:id
   */
  getBandById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const band = await this.bandService.getBandById(id);

      if (!band) {
        const response: ApiResponse = {
          success: false,
          error: 'Band not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: band,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get band by ID error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch band',
      };

      res.status(500).json(response);
    }
  };

  /**
   * Update band
   * PUT /api/bands/:id
   */
  updateBand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const band = await this.bandService.updateBand(id, updateData);

      const response: ApiResponse = {
        success: true,
        data: band,
        message: 'Band updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update band error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update band',
      };

      res.status(400).json(response);
    }
  };

  /**
   * Delete band
   * DELETE /api/bands/:id
   */
  deleteBand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.bandService.deleteBand(id);

      const response: ApiResponse = {
        success: true,
        message: 'Band deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Delete band error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete band',
      };

      res.status(500).json(response);
    }
  };

  /**
   * Get popular bands
   * GET /api/bands/popular
   */
  getPopularBands = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const bands = await this.bandService.getPopularBands(limit);

      const response: ApiResponse = {
        success: true,
        data: bands,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get popular bands error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch popular bands',
      };

      res.status(500).json(response);
    }
  };

  /**
   * Get trending bands
   * GET /api/bands/trending
   */
  getTrendingBands = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const bands = await this.bandService.getTrendingBands(limit);

      const response: ApiResponse = {
        success: true,
        data: bands,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get trending bands error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch trending bands',
      };

      res.status(500).json(response);
    }
  };

  /**
   * Get bands by genre
   * GET /api/bands/genre/:genre
   */
  getBandsByGenre = async (req: Request, res: Response): Promise<void> => {
    try {
      const { genre } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const bands = await this.bandService.getBandsByGenre(genre, limit);

      const response: ApiResponse = {
        success: true,
        data: bands,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get bands by genre error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch bands by genre',
      };

      res.status(500).json(response);
    }
  };

  /**
   * Get all genres
   * GET /api/bands/genres
   */
  getGenres = async (req: Request, res: Response): Promise<void> => {
    try {
      const genres = await this.bandService.getGenres();

      const response: ApiResponse = {
        success: true,
        data: genres,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get genres error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch genres',
      };

      res.status(500).json(response);
    }
  };
}