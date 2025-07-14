// backend/routes/vehicleRoutes.js
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import Vehicle from '../models/Vehicle.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads/vehicles';
await fs.mkdir(uploadsDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
  }
});

// Get all vehicles with filters
router.get('/', async (req, res) => {
  try {
    const {
      make,
      model,
      year,
      minPrice,
      maxPrice,
      bodyType,
      status = 'available',
      featured,
      sort = '-createdAt',
      page = 1,
      limit = 12
    } = req.query;

    // Build filter object
    const filter = {};
    if (make) filter.make = make;
    if (model) filter.model = model;
    if (year) filter.year = year;
    if (bodyType) filter.bodyType = bodyType;
    if (status) filter.status = status;
    if (featured !== undefined) filter.featured = featured === 'true';
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get vehicles
    const vehicles = await Vehicle.find(filter)
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    // Get total count
    const total = await Vehicle.countDocuments(filter);

    res.json({
      vehicles,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Error fetching vehicles' });
  }
});

// Get single vehicle
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Increment view count
    vehicle.views += 1;
    await vehicle.save();

    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ message: 'Error fetching vehicle' });
  }
});

// Create new vehicle (admin only - add auth middleware in production)
router.post('/', upload.array('images', 20), async (req, res) => {
  try {
    const vehicleData = { ...req.body };
    
    // Parse features if sent as string
    if (typeof vehicleData.features === 'string') {
      vehicleData.features = vehicleData.features.split(',').map(f => f.trim());
    }

    // Generate stock number if not provided
    if (!vehicleData.stockNumber) {
      vehicleData.stockNumber = `STK${Date.now().toString().slice(-6)}`;
    }

    // Process uploaded images
    if (req.files && req.files.length > 0) {
      vehicleData.images = [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const filename = `${uuidv4()}.webp`;
        const filepath = path.join(uploadsDir, filename);
        
        // Process and optimize image
        await sharp(file.buffer)
          .resize(1200, 800, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toFile(filepath);
        
        vehicleData.images.push({
          url: `/uploads/vehicles/${filename}`,
          alt: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Image ${i + 1}`,
          isPrimary: i === 0
        });
      }
    }

    // Create vehicle
    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();

    res.status(201).json({
      message: 'Vehicle created successfully',
      vehicle
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ message: error.message || 'Error creating vehicle' });
  }
});

// Update vehicle (admin only)
router.put('/:id', upload.array('newImages', 10), async (req, res) => {
  try {
    const vehicleData = { ...req.body };
    
    // Parse features if sent as string
    if (typeof vehicleData.features === 'string') {
      vehicleData.features = vehicleData.features.split(',').map(f => f.trim());
    }

    // Get existing vehicle
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Handle existing images (keep or delete)
    if (vehicleData.keepImages) {
      const keepImages = JSON.parse(vehicleData.keepImages);
      vehicle.images = vehicle.images.filter(img => keepImages.includes(img.url));
    }

    // Process new uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${uuidv4()}.webp`;
        const filepath = path.join(uploadsDir, filename);
        
        await sharp(file.buffer)
          .resize(1200, 800, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toFile(filepath);
        
        vehicle.images.push({
          url: `/uploads/vehicles/${filename}`,
          alt: `${vehicleData.year || vehicle.year} ${vehicleData.make || vehicle.make} ${vehicleData.model || vehicle.model}`,
          isPrimary: vehicle.images.length === 0
        });
      }
    }

    // Update vehicle fields
    Object.keys(vehicleData).forEach(key => {
      if (key !== 'keepImages' && key !== '_id') {
        vehicle[key] = vehicleData[key];
      }
    });

    await vehicle.save();

    res.json({
      message: 'Vehicle updated successfully',
      vehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: error.message || 'Error updating vehicle' });
  }
});

// Delete vehicle (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Delete associated images
    for (const image of vehicle.images) {
      const filename = path.basename(image.url);
      const filepath = path.join(uploadsDir, filename);
      try {
        await fs.unlink(filepath);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    await vehicle.deleteOne();

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Error deleting vehicle' });
  }
});

// Toggle featured status
router.patch('/:id/featured', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    vehicle.featured = !vehicle.featured;
    await vehicle.save();

    res.json({
      message: 'Featured status updated',
      featured: vehicle.featured
    });
  } catch (error) {
    console.error('Error updating featured status:', error);
    res.status(500).json({ message: 'Error updating featured status' });
  }
});

// Get statistics (admin only)
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Vehicle.aggregate([
      {
        $facet: {
          totalVehicles: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byBodyType: [
            { $group: { _id: '$bodyType', count: { $sum: 1 } } }
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
              }
            }
          ],
          totalViews: [
            { $group: { _id: null, total: { $sum: '$views' } } }
          ]
        }
      }
    ]);

    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

export default router;