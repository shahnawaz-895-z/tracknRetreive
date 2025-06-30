const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// DeepFace server URL
const DEEPFACE_SERVER_URL = 'http://localhost:5000';

// Function to convert image to base64
const imageToBase64 = (imagePath) => {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
};

// Function to verify faces using DeepFace
const verifyFaces = async (req, res) => {
    try {
        const { image1, image2 } = req.body;

        if (!image1 || !image2) {
            return res.status(400).json({ error: 'Both images are required' });
        }

        // Convert images to base64
        const img1Base64 = imageToBase64(image1);
        const img2Base64 = imageToBase64(image2);

        // Call DeepFace server
        const response = await axios.post(`${DEEPFACE_SERVER_URL}/verify`, {
            img1: img1Base64,
            img2: img2Base64
        });

        return res.json(response.data);
    } catch (error) {
        console.error('Error in face verification:', error);
        return res.status(500).json({ error: 'Error in face verification' });
    }
};

// Function to analyze a single face
const analyzeFace = async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // Convert image to base64
        const imgBase64 = imageToBase64(image);

        // Call DeepFace server
        const response = await axios.post(`${DEEPFACE_SERVER_URL}/analyze`, {
            img: imgBase64
        });

        return res.json(response.data);
    } catch (error) {
        console.error('Error in face analysis:', error);
        return res.status(500).json({ error: 'Error in face analysis' });
    }
};

module.exports = {
    verifyFaces,
    analyzeFace
}; 