from flask import Flask, request, jsonify
from deepface import DeepFace
import os
import base64
from PIL import Image
import io
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/verify', methods=['POST'])
def verify():
    try:
        # Get base64 encoded images from request
        data = request.get_json()
        img1_base64 = data.get('img1')
        img2_base64 = data.get('img2')

        if not img1_base64 or not img2_base64:
            return jsonify({
                'status': 'error',
                'message': 'Both images are required'
            }), 400

        # Convert base64 to image
        def base64_to_image(base64_string):
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64 string
            image_data = base64.b64decode(base64_string)
            return Image.open(io.BytesIO(image_data))

        # Convert images
        img1 = base64_to_image(img1_base64)
        img2 = base64_to_image(img2_base64)

        # Save temporary images
        img1.save("temp_img1.jpg")
        img2.save("temp_img2.jpg")

        # Run DeepFace verification
        result = DeepFace.verify(
            "temp_img1.jpg",
            "temp_img2.jpg",
            model_name="VGG-Face",
            detector_backend="opencv",
            distance_metric="cosine",
            enforce_detection=True,
            align=True
        )

        # Clean up temporary files
        os.remove("temp_img1.jpg")
        os.remove("temp_img2.jpg")

        return jsonify({
            'status': 'success',
            'verified': result['verified'],
            'distance': float(result['distance']),
            'threshold': float(result['threshold']),
            'model': result['model'],
            'detector_backend': result['detector_backend'],
            'similarity_metric': result['similarity_metric']
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # Get base64 encoded image from request
        data = request.get_json()
        img_base64 = data.get('img')

        if not img_base64:
            return jsonify({
                'status': 'error',
                'message': 'Image is required'
            }), 400

        # Convert base64 to image
        if ',' in img_base64:
            img_base64 = img_base64.split(',')[1]
        
        image_data = base64.b64decode(img_base64)
        img = Image.open(io.BytesIO(image_data))
        
        # Save temporary image
        img.save("temp_analyze.jpg")

        # Run DeepFace analysis
        result = DeepFace.analyze(
            "temp_analyze.jpg",
            actions=['age', 'gender', 'race', 'emotion'],
            detector_backend="opencv",
            enforce_detection=True,
            align=True
        )

        # Clean up temporary file
        os.remove("temp_analyze.jpg")

        return jsonify({
            'status': 'success',
            'analysis': result
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001) 