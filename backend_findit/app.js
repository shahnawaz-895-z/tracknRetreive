import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { User } from './userdetail.js';
import FoundItem from './founditemschema.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import LostItem from './lostitemschema.js';
import ReturnedItem from './returneditemschema.js';
import Message from './messageschema.js';
import Notification from './notificationschema.js';
import natural from 'natural';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { findPotentialMatches } from './matching.js';
import os from 'os';
import { spawn } from 'child_process';
import { blip2_service } from './blip2_service.js';
import Match from './matchschema.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (you can restrict this in production)
        methods: ['GET', 'POST'],
    },
});

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Client IP:', req.ip);
    console.log('Headers:', JSON.stringify(req.headers));
    next();
});

app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication token required'
        });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token has expired, please login again'
            });
        }
        
        return res.status(403).json({
            status: 'error',
            message: 'Invalid or expired token'
        });
    }
};

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage instead of disk storage
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// Configure multer for image upload
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadsDir = 'uploads';
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const imageUpload = multer({ storage: imageStorage });

// MongoDB connection
const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB with URI:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4
        });
        console.log('MongoDB connected successfully');

        // Test the connection by counting messages
        const messageCount = await Message.countDocuments();
        console.log(`Database contains ${messageCount} messages`);

        // Test the User model
        const userCount = await User.countDocuments();
        console.log(`Database contains ${userCount} users`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Monitor MongoDB connection
mongoose.connection.on('connected', () => console.log('Mongoose connected to MongoDB Atlas'));
mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

// Connect to MongoDB
connectDB();

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room (user ID)
    socket.on('joinRoom', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    // Send and receive messages
    socket.on('sendMessage', async (message) => {
        try {
            const { receiverId, senderId, text, clientMessageId } = message;
            console.log(`Received message from ${senderId} to ${receiverId}: ${text}`);

            // Check if a message with this client-generated ID already exists
            if (clientMessageId) {
                const existingMessage = await Message.findOne({ clientMessageId });
                if (existingMessage) {
                    console.log(`Message with ID ${clientMessageId} already exists, skipping duplicate`);

                    // Emit the existing message back to the sender for confirmation
                    io.to(senderId).emit('messageSaved', {
                        _id: existingMessage._id,
                        senderId,
                        text,
                        createdAt: existingMessage.createdAt,
                        clientMessageId
                    });

                    return;
                }
            }

            // Save message to database
            const newMessage = new Message({
                senderId,
                receiverId,
                text,
                createdAt: new Date(),
                read: false,
                clientMessageId: clientMessageId || null
            });

            const savedMessage = await newMessage.save();
            console.log('Message saved to database:', savedMessage);

            // Emit the message to the receiver
            io.to(receiverId).emit('receiveMessage', {
                _id: savedMessage._id,
                senderId,
                text,
                createdAt: savedMessage.createdAt,
                clientMessageId
            });

            // Emit confirmation back to the sender
            io.to(senderId).emit('messageSaved', {
                _id: savedMessage._id,
                senderId,
                text,
                createdAt: savedMessage.createdAt,
                clientMessageId
            });

            console.log(`Message sent from ${senderId} to ${receiverId}: ${text}`);
        } catch (error) {
            console.error('Error saving message:', error);
            // Emit error back to sender
            socket.emit('messageError', {
                error: 'Failed to save message',
                clientMessageId: message.clientMessageId
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.post('/register', upload.single('profileImage'), async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('Received file:', req.file ? `File size: ${req.file.size} bytes` : 'No file received');

        const { name, email, mobile, password } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!email) missingFields.push('email');
        if (!mobile) missingFields.push('mobile');
        if (!password) missingFields.push('password');

        if (missingFields.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate and process profile image
        let profileImage = null;
        let profileImageType = null;

        if (req.file) {
            try {
                // Validate file size (max 5MB)
                if (req.file.size > 5 * 1024 * 1024) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Image file too large (max 5MB allowed)'
                    });
                }

                // Validate MIME type
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Invalid image format. Allowed formats: JPEG, PNG, GIF, WebP, HEIC'
                    });
                }

                // Convert image buffer to base64
                profileImage = req.file.buffer.toString('base64');

                // Clean the base64 string
                profileImage = profileImage.replace(/[\s\r\n]+/g, '');

                // Validate base64 format with more permissive regex
                if (!profileImage.match(/^[A-Za-z0-9+/]+=*$/)) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Invalid image data format'
                    });
                }

                profileImageType = req.file.mimetype;
            } catch (error) {
                console.error('Error processing profile image:', error);
                return res.status(400).json({
                    status: 'error',
                    message: 'Error processing profile image'
                });
            }
        } else {
            return res.status(400).json({
                status: 'error',
                message: 'Profile image is required'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                status: 'error',
                message: 'User already exists with this email'
            });
        }

        const newUser = new User({
            name,
            email,
            mobile,
            password,
            profileImage,
            profileImageType
        });

        await newUser.save();

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error during registration',
            details: error.message
        });
    }
});


// Modify this section in app.js for the login route

// Login attempts tracking for basic rate limiting
const loginAttempts = {};

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Email and password are required' 
      });
    }
    
    // Basic rate limiting
    const ipAddress = req.ip || req.connection.remoteAddress;
    if (loginAttempts[ipAddress]) {
      const attempts = loginAttempts[ipAddress];
      const now = Date.now();
      
      // Reset attempts after 15 minutes
      if (attempts.timestamp < now - 15 * 60 * 1000) {
        loginAttempts[ipAddress] = { count: 1, timestamp: now };
      } else if (attempts.count >= 5) {
        return res.status(429).json({
          status: 'error',
          message: 'Too many login attempts. Please try again later.'
        });
      } else {
        loginAttempts[ipAddress].count += 1;
      }
    } else {
      loginAttempts[ipAddress] = { count: 1, timestamp: Date.now() };
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Avoid timing attacks by still comparing password even if user doesn't exist
    if (!user) {
      await bcrypt.compare(password, '$2b$10$InvalidUserHashForSecurityPurposes');
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid email or password' 
      });
    }
    
    // If login successful, reset the attempts counter
    if (loginAttempts[ipAddress]) {
      delete loginAttempts[ipAddress];
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );
    
    // Prepare user data for response (excluding sensitive information)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage
    };
    
    // Return success response with token and user data
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', details: error.message });
  }
});

//get profileroute

app.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // ✅ Validate if userId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid user ID format' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        let profileImage = null;
        if (user.profileImage && user.profileImage.buffer) {
            const base64Image = Buffer.from(user.profileImage.buffer).toString('base64');
            profileImage = `data:${user.profileImageType || 'image/jpeg'};base64,${base64Image}`;
        }

        console.log("🔹 Sending Profile Image (Base64 Length):", profileImage ? profileImage.length : "No Image"); // Debugging

        res.status(200).json({
            status: 'success',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                profileImage, // ✅ Correct Base64-encoded image
                profileImageType: user.profileImageType || 'image/jpeg'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Server error fetching profile', details: error.message });
    }
});

// **Update Profile Route**
const uploadMiddleware = multer({ storage: upload });

// **Use the existing 'upload' instead of declaring a new one**
app.put('/profile/:userId', upload.single('profileImage'), async (req, res) => {
    try {
        console.log('Received profile update request');
        console.log('Request body:', req.body);
        console.log('File:', req.file);

        const { userId } = req.params;
        const { name, email, mobile } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('Invalid user ID:', userId);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid user ID format'
            });
        }

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            console.log('User not found:', userId);
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Handle profile image update
        let profileImage = existingUser.profileImage;
        let profileImageType = existingUser.profileImageType;

        if (req.file) {
            console.log('Processing new profile image');
            try {
                profileImage = req.file.buffer.toString('base64');
                profileImageType = req.file.mimetype;
                console.log('Image processed successfully');
            } catch (error) {
                console.error('Error processing image:', error);
                return res.status(400).json({
                    status: 'error',
                    message: 'Error processing profile image'
                });
            }
        }

        // Update user data
        const updateData = {
            name: name || existingUser.name,
            email: email || existingUser.email,
            mobile: mobile || existingUser.mobile,
            profileImage,
            profileImageType
        };

        console.log('Updating user with data:', {
            ...updateData,
            profileImage: updateData.profileImage ? 'base64_string' : null
        });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        console.log('User updated successfully');

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                mobile: updatedUser.mobile,
                profileImage: updatedUser.profileImage,
                profileImageType: updatedUser.profileImageType
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error updating profile',
            details: error.message
        });
    }
});

app.get('/search-users', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'Search query is required'
            });
        }

        if (query.length < 3) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query must be at least 3 characters long'
            });
        }

        const searchRegex = new RegExp(query, 'i');

        const users = await User.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex }
            ]
        }).select('name email profileImage profileImageType').lean();

        // Process users to properly include profile images
        const processedUsers = users.map(user => ({
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,  // Send the full base64 string
            profileImageType: user.profileImageType || 'image/jpeg'
        }));

        return res.json({
            status: 'success',
            users: processedUsers
        });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Server error while searching users'
        });
    }
});

// **Report Found Item**
app.post('/reportfound', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        console.log('Received authenticated found item report:', req.body);
        console.log('User from token:', req.user);
        
        const { contact, location, time, date, description, category, itemName, latitude, longitude } = req.body;
        
        // Use userId from token if available
        const userId = req.user?.id || req.body.userId;
        
        if (!userId) {
            console.log('No userId found in token or request body');
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }
        
        // Validation with detailed error messages
        const missingFields = [];
        if (!contact) missingFields.push('contact');
        if (!location) missingFields.push('location');
        if (!time) missingFields.push('time');
        if (!date) missingFields.push('date');
        if (!description) missingFields.push('description');
        if (!category) missingFields.push('category');

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        let photoData = null;
        if (req.file) {
            photoData = req.file.buffer;
        }

        // Parse userId properly
        let userIdObj = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            userIdObj = new mongoose.Types.ObjectId(userId);
            console.log('Valid ObjectId for userId:', userIdObj);
        } else if (userId) {
            console.log('Invalid ObjectId format for userId:', userId);
        } else {
            console.log('No userId provided or extracted from token');
        }

        const foundItem = new FoundItem({
            contact, 
            location, 
            time, 
            date, 
            description,
            category,
            userId: userIdObj,
            itemName: itemName || description.substring(0, 30),
            coordinates: {
                latitude: latitude || null,
                longitude: longitude || null
            },
            photo: photoData
        });

        const savedItem = await foundItem.save();
        console.log(`Found item saved with ID: ${savedItem._id}, User ID: ${savedItem.userId}`);
        
        // Send success response immediately and continue match processing in background
        res.status(201).json({ 
            status: 'success', 
            message: 'Found item reported successfully',
            itemId: savedItem._id
        });
        
        // Find potential matches after responding to client
        try {
            // First filter by category to narrow down potential matches
            console.log(`Finding potential matches in category: ${category}`);
            const lostItems = await LostItem.find({ category: category });
            console.log(`Found ${lostItems.length} lost items in the same category`);
            
            for (const lostItem of lostItems) {
                try {
                    console.log(`Comparing found item ${savedItem._id} with lost item ${lostItem._id}`);
                    
                    // Call the matching service to get a similarity score
                    try {
                        const response = await axios.post(`${process.env.PYTHON_API_URL || 'http://localhost:5001'}/match`, {
                            lost_desc: lostItem.description,
                            found_desc: description
                        }, { timeout: 8000 });
                        
                        console.log(`Match result: similarity_score: ${response.data.similarity_score}`);
                        
                        // Temporarily lower the threshold for testing - change from 0.5 to 0.1
                        if (response.data && response.data.similarity_score >= 0.1) {
                            // Validate and parse user IDs for both items
                            let lostUserObjectId = null;
                            
                            if (lostItem.userId) {
                                if (mongoose.Types.ObjectId.isValid(lostItem.userId)) {
                                    lostUserObjectId = lostItem.userId;
                                } else if (typeof lostItem.userId === 'string') {
                                    if (mongoose.Types.ObjectId.isValid(lostItem.userId)) {
                                        lostUserObjectId = new mongoose.Types.ObjectId(lostItem.userId);
                                    }
                                }
                            }
                            
                            // Log the user IDs for debugging
                            console.log('Creating match with lost user ID:', lostItem.userId);
                            console.log('Lost user ID type:', typeof lostItem.userId);
                            console.log('Creating match with found user ID:', userIdObj);
                            console.log('Found user ID type:', typeof userIdObj);
                            
                            if (!lostUserObjectId) {
                                console.log('Cannot create match - invalid lost user ID');
                                continue; // Skip this match
                            }
                            
                            // Create a match record with validated IDs
                            const match = new Match({
                                lostItemId: lostItem._id,
                                lostUserId: lostUserObjectId,
                                foundItemId: savedItem._id,
                                foundUserId: userIdObj,
                                similarityScore: response.data.similarity_score,
                                status: 'pending'
                            });
                            
                            try {
                                await match.save();
                                console.log(`Created match between found item ${savedItem._id} and lost item ${lostItem._id}`);
                                console.log(`Match details: Found user ${userIdObj}, Lost user ${lostUserObjectId}`);
                                
                                // Create notifications for both users
                                if (lostItem.userId) {
                                    try {
                                        console.log(`Creating match notification for lost item reporter: ${lostItem.userId}`);
                                        
                                        await createNotification(
                                            lostItem.userId,
                                            'match_found',
                                            'Match Found!',
                                            `A match has been found for your lost item: ${lostItem.itemName || lostItem.description.substring(0, 30)}`,
                                            { 
                                                matchId: match._id.toString(), 
                                                lostItemId: lostItem._id.toString(),
                                                foundItemId: savedItem._id.toString(),
                                                
                                                // Simplified but essential match data
                                                lostItemName: lostItem.itemName || lostItem.description.substring(0, 30),
                                                lostItemDescription: lostItem.description,
                                                foundItemName: savedItem.itemName || savedItem.description.substring(0, 30),
                                                foundItemDescription: savedItem.description,
                                                
                                                // Match details
                                                matchDate: new Date(),
                                                similarityScore: response.data.similarity_score,
                                            }
                                        );
                                        console.log(`Sent match notification to lost item reporter: ${lostItem.userId}`);
                                    } catch (notifyError) {
                                        console.error('Failed to send notification:', notifyError);
                                    }
                                }

                                // Also notify the user who found the item
                                if (userIdObj) {
                                    try {
                                        console.log(`Creating match notification for found item reporter: ${userIdObj}`);
                                        
                                        await createNotification(
                                            userIdObj,
                                            'match_found',
                                            'Match Found!',
                                            `A match has been found for your found item: ${savedItem.itemName || savedItem.description.substring(0, 30)}`,
                                            { 
                                                matchId: match._id.toString(),
                                                lostItemId: lostItem._id.toString(),
                                                foundItemId: savedItem._id.toString(),
                                                
                                                // Simplified but essential match data 
                                                lostItemName: lostItem.itemName || lostItem.description.substring(0, 30),
                                                lostItemDescription: lostItem.description,
                                                foundItemName: savedItem.itemName || savedItem.description.substring(0, 30),
                                                foundItemDescription: savedItem.description,
                                                
                                                // Match details
                                                matchDate: new Date(),
                                                similarityScore: response.data.similarity_score,
                                            }
                                        );
                                        console.log(`Sent match notification to found item reporter: ${userIdObj}`);
                                    } catch (notifyError) {
                                        console.error('Failed to send notification to finder:', notifyError);
                                    }
                                }
                            } catch (saveError) {
                                console.error('Failed to save match:', saveError);
                            }
                        }
                    } catch (matchServiceError) {
                        console.error('Error with matching service:', matchServiceError.message);
                        // Continue to next item even if there's an error with this one
                    }
                } catch (itemMatchError) {
                    console.error('Error matching specific item:', itemMatchError.message);
                    // Continue to next item
                }
            }
        } catch (matchError) {
            console.error('Error finding matches:', matchError);
            // Matching failed but the item was already saved successfully
        }
    } catch (error) {
        console.error('Error reporting found item:', error);
        // Send error response only if we haven't already sent a success response
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Server error reporting found item' });
        }
    }
});

// **Report Lost Item**
app.post('/lostitem', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        console.log('Received authenticated lost item report:', req.body);
        console.log('User from token:', req.user);
        
        const { 
            contact, 
            location, 
            time, 
            date, 
            description, 
            category, 
            itemName, 
            latitude, 
            longitude, 
            uniquePoint,
            hasReward,
            rewardAmount,
            rewardCurrency,
            rewardDescription 
        } = req.body;
        
        // Use userId from token if available
        const userId = req.user?.id || req.body.userId;
        
        if (!userId) {
            console.log('No userId found in token or request body');
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }
        
        // Validation with detailed error messages
        const missingFields = [];
        if (!contact) missingFields.push('contact');
        if (!location) missingFields.push('location');
        if (!time) missingFields.push('time');
        if (!date) missingFields.push('date');
        if (!description) missingFields.push('description');
        if (!category) missingFields.push('category');
        if (!uniquePoint) missingFields.push('uniquePoint');

        if (missingFields.length > 0) {
            console.log(`Missing required fields: ${missingFields.join(', ')}`);
            return res.status(400).json({ 
                status: 'error', 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        let photoData = null;
        if (req.file) {
            photoData = req.file.buffer;
        }

        const lostItem = new LostItem({
            contact,
            location,
            time,
            date,
            description,
            category,
            userId: userId,
            itemName: itemName || description.substring(0, 30),
            uniquePoint: uniquePoint,
            coordinates: {
                latitude: latitude || null,
                longitude: longitude || null
            },
            photo: photoData,
            // Add reward fields
            hasReward: hasReward === 'true',
            rewardAmount: hasReward === 'true' ? parseFloat(rewardAmount) : 0,
            rewardCurrency: hasReward === 'true' ? rewardCurrency : 'USD',
            rewardDescription: hasReward === 'true' ? rewardDescription : ''
        });

        try {
            // Save the lost item
            const savedItem = await lostItem.save();
            
            // Send success response first to not keep user waiting
            res.status(201).json({ 
                status: 'success', 
                message: 'Lost item reported successfully',
                itemId: savedItem._id
            });
            
            // After response sent, notify all users about the lost item
            try {
                // Get all users except the one who reported the lost item
                const allUsers = await User.find({}, '_id');
                console.log(`Found ${allUsers.length} users to notify about lost item`);
                
                // For each user, create a notification
                for (const user of allUsers) {
                    // Skip the user who reported the item
                    if (userId && user._id.toString() === userId.toString()) {
                        console.log(`Skipping notification to reporting user: ${userId}`);
                        continue;
                    }
                    
                    try {
                        const notification = new Notification({
                            userId: user._id,
                            type: 'lost_item_report',
                            title: 'New Lost Item Reported',
                            message: `Someone lost a ${category}: ${itemName || description.substring(0, 30)}`,
                            read: false,
                            lostItemId: savedItem._id,
                            location: location,
                            time: time,
                            date: date,
                            category: category,
                            itemName: itemName || description.substring(0, 30)
                        });
                        
                        await notification.save();
                        console.log(`Notification sent to user ${user._id} about lost item ${savedItem._id}`);
                    } catch (notificationError) {
                        console.error(`Error creating notification for user ${user._id}:`, notificationError);
                        // Continue to next user even if this one fails
                    }
                }
            } catch (notificationError) {
                console.error('Error sending notifications about lost item:', notificationError);
                // Notifications failed but item was already saved and response sent
            }
            
        } catch (saveError) {
            console.error('Error saving lost item:', saveError);
            if (saveError.name === 'ValidationError') {
                const validationErrors = Object.keys(saveError.errors).map(field => 
                    `${field}: ${saveError.errors[field].message}`
                );
                return res.status(400).json({ 
                    status: 'validation_error', 
                    message: 'Validation error', 
                    errors: validationErrors 
                });
            }
            throw saveError; // Re-throw for the outer catch
        }
    } catch (error) {
        console.error('Error reporting lost item:', error);
        // Send error response only if we haven't already sent a success response
        if (!res.headersSent) {
            res.status(500).json({ 
                status: 'error', 
                message: 'Server error reporting lost item',
                details: error.message 
            });
        }
    }
});

// **Get user notifications**
app.get('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            status: 'success',
            notifications
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching notifications',
            details: error.message
        });
    }
});

// **Mark notification as read**
app.put('/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// **Get Lost Item by ID**
app.get('/lostitem/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid item ID format'
            });
        }

        const lostItem = await LostItem.findById(id);

        if (!lostItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Lost item not found'
            });
        }

        // Process the item data
        const processedItem = lostItem.toObject();
        
        // Process photo if it exists
        if (processedItem.photo) {
            try {
                console.log('Processing photo data type:', typeof processedItem.photo);
                console.log('Photo data structure:', Object.keys(processedItem.photo));
                
                // Convert Buffer to base64 string
                if (Buffer.isBuffer(processedItem.photo)) {
                    console.log('Converting Buffer to base64');
                    processedItem.photo = processedItem.photo.toString('base64');
                } else if (processedItem.photo.buffer) {
                    console.log('Converting photo.buffer to base64');
                    processedItem.photo = Buffer.from(processedItem.photo.buffer).toString('base64');
                } else if (processedItem.photo.data) {
                    console.log('Converting photo.data to base64');
                    processedItem.photo = Buffer.from(processedItem.photo.data).toString('base64');
                } else {
                    console.log('Photo data is not in expected format');
                    processedItem.photo = null;
                }
                
                // Log the processed photo data
                if (processedItem.photo) {
                    console.log('Processed photo data length:', processedItem.photo.length);
                    console.log('First 50 chars of processed photo:', processedItem.photo.substring(0, 50));
                }
            } catch (photoError) {
                console.error('Error processing photo:', photoError);
                processedItem.photo = null;
            }
        }
        
        res.status(200).json({
            status: 'success',
            item: processedItem
        });
        
    } catch (error) {
        console.error('Error fetching lost item:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching lost item',
            details: error.message
        });
    }
});

// **Get Found Item by ID**
app.get('/founditem/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid item ID format'
            });
        }

        const foundItem = await FoundItem.findById(id);

        if (!foundItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Found item not found'
            });
        }

        // Process the item data
        const processedItem = foundItem.toObject();
        
        // Process photo if it exists
        if (processedItem.photo) {
            try {
                console.log('Processing photo data type:', typeof processedItem.photo);
                console.log('Photo data structure:', Object.keys(processedItem.photo));
                
                // Convert Buffer to base64 string
                if (Buffer.isBuffer(processedItem.photo)) {
                    console.log('Converting Buffer to base64');
                    processedItem.photo = processedItem.photo.toString('base64');
                } else if (processedItem.photo.buffer) {
                    console.log('Converting photo.buffer to base64');
                    processedItem.photo = Buffer.from(processedItem.photo.buffer).toString('base64');
                } else if (processedItem.photo.data) {
                    console.log('Converting photo.data to base64');
                    processedItem.photo = Buffer.from(processedItem.photo.data).toString('base64');
                } else {
                    console.log('Photo data is not in expected format');
                    processedItem.photo = null;
                }
            } catch (photoError) {
                console.error('Error processing photo:', photoError);
                processedItem.photo = null;
            }
        }

        return res.status(200).json({
            status: 'success',
            item: processedItem
        });
    } catch (error) {
        console.error('Error fetching found item:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error fetching found item details',
            details: error.message
        });
    }
});

// **Check server connectivity**
app.get('/check', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// **Get match details by ID**
app.get('/match/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(matchId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid match ID format'
            });
        }
        
        // Fetch the match with populated references to lost and found items
        const match = await Match.findById(matchId)
            .populate('lostItemId')
            .populate('foundItemId')
            .populate('lostUserId', 'name email')
            .populate('foundUserId', 'name email');
        
        if (!match) {
            return res.status(404).json({
                status: 'error',
                message: 'Match not found'
            });
        }
        
        // Process photos for both items if they exist
        const processedMatch = match.toObject();
        
        if (processedMatch.lostItemId && processedMatch.lostItemId.photo) {
            try {
                if (Buffer.isBuffer(processedMatch.lostItemId.photo)) {
                    processedMatch.lostItemId.photo = processedMatch.lostItemId.photo.toString('base64');
                } else if (processedMatch.lostItemId.photo.buffer) {
                    processedMatch.lostItemId.photo = processedMatch.lostItemId.photo.buffer.toString('base64');
                } else if (processedMatch.lostItemId.photo.data) {
                    processedMatch.lostItemId.photo = processedMatch.lostItemId.photo.data.toString('base64');
                }
            } catch (photoError) {
                console.error('Error processing lost item photo:', photoError);
                processedMatch.lostItemId.photo = null;
            }
        }
        
        if (processedMatch.foundItemId && processedMatch.foundItemId.photo) {
            try {
                if (Buffer.isBuffer(processedMatch.foundItemId.photo)) {
                    processedMatch.foundItemId.photo = processedMatch.foundItemId.photo.toString('base64');
                } else if (processedMatch.foundItemId.photo.buffer) {
                    processedMatch.foundItemId.photo = processedMatch.foundItemId.photo.buffer.toString('base64');
                } else if (processedMatch.foundItemId.photo.data) {
                    processedMatch.foundItemId.photo = processedMatch.foundItemId.photo.data.toString('base64');
                }
            } catch (photoError) {
                console.error('Error processing found item photo:', photoError);
                processedMatch.foundItemId.photo = null;
            }
        }
        
        return res.status(200).json({
            status: 'success',
            match: processedMatch
        });
    } catch (error) {
        console.error('Error fetching match details:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error fetching match details',
            details: error.message
        });
    }
});

// **Update match status**
app.put('/update-match-status/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        const { status } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(matchId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid match ID format'
            });
        }
        
        if (!status || !['pending', 'matched', 'declined', 'returned', 'claimed', 'unclaimed'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status value'
            });
        }
        
        const match = await Match.findByIdAndUpdate(
            matchId,
            { status, updatedAt: new Date() },
            { new: true }
        );
        
        if (!match) {
            return res.status(404).json({
                status: 'error',
                message: 'Match not found'
            });
        }
        
        // Send a notification to the other user about the status change
        try {
            let notificationReceiver, notificationSender;
            const user = req.user;
            
            if (match.lostUserId.toString() === user._id.toString()) {
                // Lost item reporter updated the status, notify found item reporter
                notificationReceiver = match.foundUserId;
                notificationSender = match.lostUserId;
            } else {
                // Found item reporter updated the status, notify lost item reporter
                notificationReceiver = match.lostUserId;
                notificationSender = match.foundUserId;
            }
            
            let statusMessage;
            switch(status) {
                case 'matched': statusMessage = 'confirmed the match'; break;
                case 'declined': statusMessage = 'declined the match'; break;
                case 'returned': statusMessage = 'marked the item as returned'; break;
                case 'claimed': statusMessage = 'claimed the item'; break;
                default: statusMessage = `updated the status to ${status}`;
            }
            
            // Create notification for the other user
            if (notificationReceiver) {
                await createNotification(
                    notificationReceiver,
                    'match_update',
                    'Match Status Updated',
                    `The other user ${statusMessage} for your item.`,
                    { 
                        matchId: match._id,
                        newStatus: status,
                        updatedAt: new Date()
                    }
                );
            }
        } catch (notifyError) {
            console.error('Error sending match update notification:', notifyError);
            // Continue anyway, the match status was still updated
        }
        
        return res.status(200).json({
            status: 'success',
            message: 'Match status updated successfully',
            match
        });
    } catch (error) {
        console.error('Error updating match status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error updating match status',
            details: error.message
        });
    }
});

// **Get Dashboard Statistics**
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Count all documents in each collection
        const lostItemsCount = await LostItem.countDocuments();
        const foundItemsCount = await FoundItem.countDocuments();
        const matchesCount = await Match.countDocuments();
        
        // Count items by status
        const returnedItemsCount = await Match.countDocuments({ status: 'completed' });
        const pendingItemsCount = await Match.countDocuments({ status: 'pending' });
        
        // Get monthly data for the current year
        const currentYear = new Date().getFullYear();
        const monthlyStats = [];
        
        // For each month, get counts
        for (let month = 0; month < 12; month++) {
            const startDate = new Date(currentYear, month, 1);
            const endDate = new Date(currentYear, month + 1, 0);
            
            const lostCount = await LostItem.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            });
            
            const foundCount = await FoundItem.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            });
            
            const matchCount = await Match.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            });
            
            monthlyStats.push({
                month: month + 1,
                lost: lostCount,
                found: foundCount,
                matches: matchCount
            });
        }
        
        res.status(200).json({
            status: 'success',
            stats: {
                lostItems: lostItemsCount,
                foundItems: foundItemsCount,
                totalMatches: matchesCount,
                returnedItems: returnedItemsCount,
                pendingItems: pendingItemsCount,
                monthlyData: monthlyStats
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
});

// **Repost Lost Item**
app.post('/repost-lost-item/:id', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Reposting lost item with ID: ${id}`);
        
        // Get the authenticated user from the request
        const userId = req.user._id;
        console.log(`User ID from auth token: ${userId}`);

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid item ID format'
            });
        }

        // Find existing lost item
        const existingItem = await LostItem.findById(id);
        if (!existingItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Lost item not found'
            });
        }

        console.log(`Found existing item: ${existingItem._id}, userId: ${existingItem.userId || 'none'}`);
        
        // Update the userId if not set
        if (!existingItem.userId && userId) {
            console.log(`Updating item userId from ${existingItem.userId} to ${userId}`);
            existingItem.userId = userId;
        }
        
        // Update timestamp to mark as reposted
        existingItem.repostedAt = new Date();
        await existingItem.save();
        console.log(`Item updated with repostedAt: ${existingItem.repostedAt}`);

        // Create notification for the original reporter
        const itemUserId = existingItem.userId || userId;
        console.log(`Creating notification for user: ${itemUserId}`);
        
        // Send success response first to not keep the user waiting
        res.status(200).json({
            status: 'success',
            message: 'Lost item reposted successfully',
            item: existingItem
        });

        // Handle notifications in the background after responding
        if (itemUserId) {
            try {
                console.log(`Creating repost notification for user: ${itemUserId}`);
                console.log(`Item details for notification:`, {
                    id: existingItem._id.toString(),
                    name: existingItem.itemName || existingItem.description.substring(0, 30),
                    location: existingItem.location,
                    category: existingItem.category
                });
                
                const repostNotification = await createNotification(
                    itemUserId,
                    'lost_item_repost',
                    'Item Reposted',
                    `Your lost item '${existingItem.itemName || existingItem.description.substring(0, 30)}' has been reposted for continued searching.`,
                    {
                        lostItemId: existingItem._id.toString(),
                        itemName: existingItem.itemName || existingItem.description.substring(0, 30),
                        location: existingItem.location,
                        date: existingItem.date,
                        time: existingItem.time,
                        category: existingItem.category
                    }
                );
                
                if (repostNotification) {
                    console.log(`Successfully created repost notification with ID: ${repostNotification._id}`);
                } else {
                    console.error('Failed to create repost notification - createNotification returned null');
                }
                
                // Verify notification was created
                const verifyNotification = await Notification.findById(repostNotification?._id);
                if (verifyNotification) {
                    console.log(`Verified notification exists in DB with ID: ${verifyNotification._id}`);
                } else {
                    console.error(`Failed to verify notification in DB`);
                }
            } catch (notifyError) {
                console.error('Failed to send repost notification:', notifyError);
            }
        } else {
            console.log('No user ID available to send repost notification');
        }

        // Find potential matches with found items
        try {
            console.log(`Finding matches for reposted lost item in category: ${existingItem.category}`);
            const foundItems = await FoundItem.find({ category: existingItem.category });
            console.log(`Found ${foundItems.length} found items in the same category`);

            let matchCount = 0;
            for (const foundItem of foundItems) {
                try {
                    console.log(`Comparing reposted lost item ${existingItem._id} with found item ${foundItem._id}`);
                    
                    // Call the matching service to get a similarity score
                    const response = await axios.post(`${process.env.PYTHON_API_URL || 'http://localhost:5001'}/match`, {
                        lost_desc: existingItem.description,
                        found_desc: foundItem.description
                    }, { timeout: 8000 });
                    
                    console.log(`Match result: similarity_score: ${response.data.similarity_score}`);
                    
                    // Check if this is a potential match - lowering threshold to 0.3 for testing
                    if (response.data && response.data.similarity_score >= 0.3) {
                        // Check if a match already exists to avoid duplicates
                        const existingMatch = await Match.findOne({
                            lostItemId: existingItem._id,
                            foundItemId: foundItem._id
                        });

                        if (existingMatch) {
                            console.log(`Match already exists between these items, skipping`);
                            continue;
                        }

                        // Create a new match record
                        const match = new Match({
                            lostItemId: existingItem._id,
                            lostUserId: existingItem.userId || userId,
                            foundItemId: foundItem._id,
                            foundUserId: foundItem.userId,
                            similarityScore: response.data.similarity_score,
                            status: 'pending'
                        });
                        
                        await match.save();
                        console.log(`Created match between reposted lost item ${existingItem._id} and found item ${foundItem._id}`);
                        matchCount++;
                        
                        // Notify the user who reported the lost item
                        const lostItemUserId = existingItem.userId || userId;
                        if (lostItemUserId) {
                            try {
                                console.log(`Creating match notification for lost item reporter: ${lostItemUserId}`);
                                const lostNotification = await createNotification(
                                    lostItemUserId,
                                    'match_found',
                                    'Match Found!',
                                    `Good news! Your lost item '${existingItem.itemName || existingItem.description.substring(0, 30)}' matches a found item reported by another user.`,
                                    { 
                                        matchId: match._id.toString(), 
                                        lostItemId: existingItem._id.toString(),
                                        foundItemId: foundItem._id.toString(),
                                        lostItemName: existingItem.itemName || existingItem.description.substring(0, 30),
                                        lostItemDescription: existingItem.description,
                                        foundItemName: foundItem.itemName || foundItem.description.substring(0, 30),
                                        foundItemDescription: foundItem.description,
                                        matchDate: new Date(),
                                        similarityScore: response.data.similarity_score
                                    }
                                );
                                
                                if (lostNotification) {
                                    console.log(`Match notification created for lost item user with ID: ${lostNotification._id}`);
                                    
                                    // Verify notification was created
                                    const verifyLostNotification = await Notification.findById(lostNotification._id);
                                    if (verifyLostNotification) {
                                        console.log(`Verified lost item notification exists in DB: ${verifyLostNotification._id}`);
                                    } else {
                                        console.error(`Failed to verify lost item notification with ID: ${lostNotification._id}`);
                                    }
                                } else {
                                    console.error(`Failed to create match notification for lost item user - createNotification returned null`);
                                }
                            } catch (notifyError) {
                                console.error('Failed to send match notification to lost item reporter:', notifyError);
                            }
                        }

                        // Notify the user who found the item
                        if (foundItem.userId) {
                            try {
                                console.log(`Creating match notification for found item reporter: ${foundItem.userId}`);
                                const foundNotification = await createNotification(
                                    foundItem.userId,
                                    'match_found',
                                    'Match Found!',
                                    `A lost item has been reported that matches the item you found: '${foundItem.itemName || foundItem.description.substring(0, 30)}'.`,
                                    { 
                                        matchId: match._id.toString(), 
                                        lostItemId: existingItem._id.toString(),
                                        foundItemId: foundItem._id.toString(),
                                        lostItemName: existingItem.itemName || existingItem.description.substring(0, 30),
                                        lostItemDescription: existingItem.description,
                                        foundItemName: foundItem.itemName || foundItem.description.substring(0, 30),
                                        foundItemDescription: foundItem.description,
                                        matchDate: new Date(),
                                        similarityScore: response.data.similarity_score
                                    }
                                );
                                
                                if (foundNotification) {
                                    console.log(`Match notification created for found item user with ID: ${foundNotification._id}`);
                                    
                                    // Verify notification was created
                                    const verifyFoundNotification = await Notification.findById(foundNotification._id);
                                    if (verifyFoundNotification) {
                                        console.log(`Verified found item notification exists in DB: ${verifyFoundNotification._id}`);
                                    } else {
                                        console.error(`Failed to verify found item notification with ID: ${foundNotification._id}`);
                                    }
                                } else {
                                    console.error(`Failed to create match notification for found item user - createNotification returned null`);
                                }
                            } catch (notifyError) {
                                console.error('Failed to send match notification to found item reporter:', notifyError);
                            }
                        }
                    }
                } catch (matchError) {
                    console.error(`Error matching reposted lost item with found item ${foundItem._id}:`, matchError);
                }
            }
            console.log(`Completed matching process. Created ${matchCount} matches.`);
        } catch (matchingError) {
            console.error('Error in background matching for reposted item:', matchingError);
        }
    } catch (error) {
        console.error('Error reposting lost item:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error reposting lost item',
            details: error.message
        });
    }
});

// **Record a match between a lost and found item**
app.post('/api/record-match', authenticateToken, async (req, res) => {
    try {
        const { lostItemId, foundItemId, similarityScore, lostItemDescription, foundItemDescription, createNotifications } = req.body;
        const userId = req.user._id;

        console.log(`Recording match between lost item ${lostItemId} and found item ${foundItemId}`);
        console.log(`Similarity score: ${similarityScore}`);
        console.log(`Creating notifications: ${createNotifications}`);

        // Validate input
        if (!lostItemId || !foundItemId) {
            return res.status(400).json({
                status: 'error',
                message: 'Both lost and found item IDs are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(lostItemId) || !mongoose.Types.ObjectId.isValid(foundItemId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid item ID format'
            });
        }

        // Get lost and found items
        const lostItem = await LostItem.findById(lostItemId);
        const foundItem = await FoundItem.findById(foundItemId);

        if (!lostItem || !foundItem) {
            return res.status(404).json({
                status: 'error',
                message: 'One or both items not found'
            });
        }

        console.log(`Found lost item: ${lostItem.itemName || 'unnamed'}`);
        console.log(`Found found item: ${foundItem.itemName || 'unnamed'}`);

        // Check if a match already exists
        const existingMatch = await Match.findOne({
            lostItemId: lostItemId,
            foundItemId: foundItemId
        });

        if (existingMatch) {
            console.log(`Match already exists between these items`);
            return res.status(409).json({
                status: 'warning',
                message: 'A match already exists between these items',
                matchId: existingMatch._id
            });
        }

        // Determine user IDs
        const lostUserId = lostItem.userId || userId;
        const foundUserId = foundItem.userId || userId;

        console.log(`Lost user ID: ${lostUserId}`);
        console.log(`Found user ID: ${foundUserId}`);

        // Create a new match
        const match = new Match({
            lostItemId: lostItemId,
            lostUserId: lostUserId,
            foundItemId: foundItemId,
            foundUserId: foundUserId,
            similarityScore: similarityScore,
            status: 'pending',
            matchDate: new Date()
        });

        await match.save();
        console.log(`Created match with ID: ${match._id}`);

        // Create notifications if requested
        if (createNotifications) {
            // Only create notifications if the lost and found items belong to different users
            if (lostUserId.toString() !== foundUserId.toString()) {
                // Create notification for lost item user
                try {
                    console.log(`Creating notification for lost item user ${lostUserId}`);
                    const lostNotification = await createNotification(
                        lostUserId,
                        'match_found',
                        'Match Found!',
                        `Good news! Your lost item '${lostItem.itemName || lostItem.description.substring(0, 30)}' matches a found item reported by another user.`,
                        { 
                            matchId: match._id.toString(), 
                            lostItemId: lostItem._id.toString(),
                            foundItemId: foundItem._id.toString(),
                            lostItemName: lostItem.itemName || lostItem.description.substring(0, 30),
                            lostItemDescription: lostItemDescription || lostItem.description,
                            foundItemName: foundItem.itemName || foundItem.description.substring(0, 30),
                            foundItemDescription: foundItemDescription || foundItem.description,
                            matchDate: new Date(),
                            similarityScore: similarityScore
                        }
                    );
                    
                    if (lostNotification) {
                        console.log(`Created notification for lost item user: ${lostNotification._id}`);
                    }
                } catch (notifyError) {
                    console.error('Error creating notification for lost item user:', notifyError);
                }

                // Create notification for found item user
                try {
                    console.log(`Creating notification for found item user ${foundUserId}`);
                    const foundNotification = await createNotification(
                        foundUserId,
                        'match_found',
                        'Match Found!',
                        `A lost item has been reported that matches the item you found: '${foundItem.itemName || foundItem.description.substring(0, 30)}'.`,
                        { 
                            matchId: match._id.toString(), 
                            lostItemId: lostItem._id.toString(),
                            foundItemId: foundItem._id.toString(),
                            lostItemName: lostItem.itemName || lostItem.description.substring(0, 30),
                            lostItemDescription: lostItemDescription || lostItem.description,
                            foundItemName: foundItem.itemName || foundItem.description.substring(0, 30),
                            foundItemDescription: foundItemDescription || foundItem.description,
                            matchDate: new Date(),
                            similarityScore: similarityScore
                        }
                    );
                    
                    if (foundNotification) {
                        console.log(`Created notification for found item user: ${foundNotification._id}`);
                    }
                } catch (notifyError) {
                    console.error('Error creating notification for found item user:', notifyError);
                }
            } else {
                console.log(`Skipping notifications as both items belong to the same user: ${lostUserId}`);
            }
        }

        // Return success
        res.status(200).json({
            status: 'success',
            message: 'Match recorded successfully',
            matchId: match._id
        });
    } catch (error) {
        console.error('Error recording match:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error recording match',
            details: error.message
        });
    }
});

// API route to get all returned items
app.get('/returned-items', authenticateToken, async (req, res) => {
    try {
        const returnedItems = await ReturnedItem.find()
            .sort({ returnedAt: -1 });
        
        return res.status(200).json({
            status: 'success',
            items: returnedItems
        });
    } catch (error) {
        console.error('Error fetching returned items:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch returned items',
            error: error.message
        });
    }
});

// API route to return a lost or found item
app.post('/return-item', authenticateToken, async (req, res) => {
    try {
        const { itemId, itemType, returnNotes } = req.body;
        
        if (!itemId || !itemType) {
            return res.status(400).json({
                status: 'error',
                message: 'Item ID and type are required'
            });
        }
        
        // Validate item type
        if (itemType !== 'lost' && itemType !== 'found') {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid item type. Must be either "lost" or "found"'
            });
        }
        
        // Get the correct model based on itemType
        const ItemModel = itemType === 'lost' ? LostItem : FoundItem;
        const itemTypeForSchema = itemType === 'lost' ? 'LostItem' : 'FoundItem';
        
        // Find the original item
        const originalItem = await ItemModel.findById(itemId);
        
        if (!originalItem) {
            return res.status(404).json({
                status: 'error',
                message: `${itemType === 'lost' ? 'Lost' : 'Found'} item not found`
            });
        }

        try {  
            // Create a returned item record
            const returnedItem = new ReturnedItem({
                itemId: originalItem._id,
                itemType: itemTypeForSchema,
                originalItem: originalItem.toObject(),
                returnedBy: req.user.id,
                returnNotes,
                itemName: originalItem.itemName || 'Unnamed Item',
                category: originalItem.category || 'Uncategorized',
                location: originalItem.location || 'Unknown',
                date: originalItem.date || new Date(),
                photo: originalItem.photo
            });
            
            await returnedItem.save();
            
            // Delete the original item
            await ItemModel.findByIdAndDelete(itemId);
            
            // Create a notification for the original reporter
            try {
                await createNotification(
                    originalItem.userId,
                    'item_returned',
                    'Item Returned',
                    `Your ${itemType} item "${originalItem.itemName}" has been marked as returned.`,
                    {
                        itemName: originalItem.itemName || 'Unnamed Item'
                    }
                );
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Continue even if notification fails
            }
            
            return res.status(200).json({
                status: 'success',
                message: 'Item has been successfully marked as returned',
                returnedItem
            });
        } catch (innerError) {
            console.error('Error in return item operation:', innerError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to process return item operation',
                error: innerError.message
            });
        }
    } catch (error) {
        console.error('Error returning item:', error);
        // Ensure we always return a JSON response
        return res.status(500).json({
            status: 'error',
            message: 'Failed to return item',
            error: error.message
        });
    }
});

// API route to get returned items for a specific user
app.get('/user-returned-items/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user has permission to access these items
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to access these items'
            });
        }
        
        // Find all items where this user was the original reporter
        const returnedItems = await ReturnedItem.find({
            'originalItem.userId': userId
        }).sort({ returnedAt: -1 });
        
        return res.status(200).json({
            status: 'success',
            items: returnedItems
        });
    } catch (error) {
        console.error('Error fetching user returned items:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch returned items',
            error: error.message
        });
    }
});

// Face matching endpoint
app.post('/lostitem/search', async (req, res) => {
  try {
    const { image, category } = req.body;

    if (!image || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Image and category are required'
      });
    }

    if (category !== 'Lost Person') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category for face matching'
      });
    }

    // Get all lost person reports
    const lostPersons = await LostItem.find({ category: 'Lost Person' });

    // Compare the uploaded image with each lost person's photo
    const matches = [];
    for (const lostPerson of lostPersons) {
      if (lostPerson.photo) {
        try {
          const response = await axios.post('https://api.deepface.com/v1/face/verify', {
            img1: image,
            img2: lostPerson.photo,
            detector_backend: 'opencv',
            model_name: 'VGG-Face',
            distance_metric: 'cosine',
            enforce_detection: true,
            align: true,
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPFACE_API_KEY}`
            }
          });

          if (response.data.verified) {
            matches.push({
              ...lostPerson.toObject(),
              matchConfidence: response.data.distance
            });
          }
        } catch (error) {
          console.error('Error comparing faces:', error);
          continue;
        }
      }
    }

    // Sort matches by confidence
    matches.sort((a, b) => b.matchConfidence - a.matchConfidence);

    res.status(200).json(matches);
  } catch (error) {
    console.error('Error in face matching:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process face matching'
    });
  }
});

// Add new endpoint for BLIP-2 image captioning
app.post('/api/generate-caption', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Save the uploaded file temporarily
        const tempFilePath = path.join(__dirname, 'temp_' + Date.now() + '.jpg');
        fs.writeFileSync(tempFilePath, req.file.buffer);

        try {
            // Import and use BLIP2Service
            const { blip2_service } = await import('./blip2_service.js');
            const caption = await blip2_service.generateCaption(tempFilePath);
            
            // Clean up the temporary file
            fs.unlinkSync(tempFilePath);

            if (!caption) {
                return res.status(500).json({ error: 'Failed to generate caption' });
            }

            res.json({ caption });
        } catch (error) {
            // Clean up the temporary file in case of error
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error generating caption:', error);
        res.status(500).json({ error: 'Failed to generate caption' });
    }
});

// **Get user conversations**
app.get('/api/messages/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        // Find all messages where the user is either sender or receiver
        const messages = await Message.find({
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        }).sort({ createdAt: -1 });

        // Group messages by conversation partner
        const conversations = {};
        messages.forEach(message => {
            const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
            if (!conversations[partnerId]) {
                conversations[partnerId] = {
                    id: partnerId,
                    lastMessage: message.text,
                    time: message.createdAt,
                    unread: !message.read && message.receiverId === userId
                };
            }
        });

        // Convert to array and get user details
        const conversationList = await Promise.all(
            Object.values(conversations).map(async (conv) => {
                try {
                    const user = await User.findById(conv.id);
                    return {
                        ...conv,
                        name: user ? (user.username || user.email) : 'Unknown User',
                        avatar: user ? user.avatar : null
                    };
                } catch (error) {
                    console.error('Error fetching user details:', error);
                    return {
                        ...conv,
                        name: 'Unknown User',
                        avatar: null
                    };
                }
            })
        );

        res.status(200).json(conversationList);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch conversations',
            details: error.message
        });
    }
});

// **Get messages between two users**
app.get('/api/messages/:userId/:partnerId', authenticateToken, async (req, res) => {
    try {
        const { userId, partnerId } = req.params;

        if (!userId || !partnerId) {
            return res.status(400).json({
                status: 'error',
                message: 'Both user IDs are required'
            });
        }

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: partnerId },
                { senderId: partnerId, receiverId: userId }
            ]
        }).sort({ createdAt: -1 });

        // Mark unread messages as read
        await Message.updateMany(
            {
                senderId: partnerId,
                receiverId: userId,
                read: false
            },
            { read: true }
        );

        res.status(200).json({
            status: 'success',
            messages: messages.map(msg => ({
                ...msg.toObject(),
                user: {
                    _id: msg.senderId
                }
            }))
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch messages',
            details: error.message
        });
    }
});

// **Get user matches**
app.get('/api/view-matches', async (req, res) => {
    try {
        const { userId, page = 1, limit = 10 } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        // Convert page and limit to numbers
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Find matches where the user is either the lost item owner or found item owner
        const matches = await Match.find({
            $or: [
                { lostUserId: userId },
                { foundUserId: userId }
            ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('lostItemId')
        .populate('foundItemId')
        .populate('lostUserId', 'name email')
        .populate('foundUserId', 'name email');

        // Get total count for pagination
        const totalMatches = await Match.countDocuments({
            $or: [
                { lostUserId: userId },
                { foundUserId: userId }
            ]
        });

        // Process photos for both items if they exist
        const processedMatches = matches.map(match => {
            const processedMatch = match.toObject();
            
            // Process lost item photo
            if (processedMatch.lostItemId && processedMatch.lostItemId.photo) {
                try {
                    if (Buffer.isBuffer(processedMatch.lostItemId.photo)) {
                        processedMatch.lostItemId.photo = processedMatch.lostItemId.photo.toString('base64');
                    } else if (processedMatch.lostItemId.photo.buffer) {
                        processedMatch.lostItemId.photo = processedMatch.lostItemId.photo.buffer.toString('base64');
                    } else if (processedMatch.lostItemId.photo.data) {
                        processedMatch.lostItemId.photo = processedMatch.lostItemId.photo.data.toString('base64');
                    }
                } catch (photoError) {
                    console.error('Error processing lost item photo:', photoError);
                    processedMatch.lostItemId.photo = null;
                }
            }

            // Process found item photo
            if (processedMatch.foundItemId && processedMatch.foundItemId.photo) {
                try {
                    if (Buffer.isBuffer(processedMatch.foundItemId.photo)) {
                        processedMatch.foundItemId.photo = processedMatch.foundItemId.photo.toString('base64');
                    } else if (processedMatch.foundItemId.photo.buffer) {
                        processedMatch.foundItemId.photo = processedMatch.foundItemId.photo.buffer.toString('base64');
                    } else if (processedMatch.foundItemId.photo.data) {
                        processedMatch.foundItemId.photo = processedMatch.foundItemId.photo.data.toString('base64');
                    }
                } catch (photoError) {
                    console.error('Error processing found item photo:', photoError);
                    processedMatch.foundItemId.photo = null;
                }
            }

            return processedMatch;
        });

        res.status(200).json({
            status: 'success',
            matches: processedMatches,
            totalMatches,
            currentPage: pageNum,
            totalPages: Math.ceil(totalMatches / limitNum)
        });
    } catch (error) {
        console.error('Error fetching user matches:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching matches',
            details: error.message
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
});