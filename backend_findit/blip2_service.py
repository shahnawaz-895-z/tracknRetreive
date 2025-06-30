import sys
import json
import torch
from transformers import Blip2Processor, Blip2ForConditionalGeneration
from PIL import Image
import os

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": "Image file not found"}))
        sys.exit(1)

    try:
        # Initialize the model and processor
        processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
        model = Blip2ForConditionalGeneration.from_pretrained(
            "Salesforce/blip2-opt-2.7b",
            torch_dtype=torch.float16
        )
        
        # Move model to GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(device)
        
        # Load and preprocess the image
        image = Image.open(image_path).convert('RGB')
        
        # Process the image
        inputs = processor(image, return_tensors="pt").to(device, torch.float16)
        
        # Generate caption
        generated_ids = model.generate(
            **inputs,
            max_length=50,
            num_beams=5,
            min_length=5,
            top_p=0.9,
            repetition_penalty=1.5,
            length_penalty=1.0,
            temperature=1.0,
        )
        
        # Decode the generated caption
        caption = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
        
        # Output the result as JSON
        print(json.dumps({"caption": caption}))
        sys.exit(0)
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main() 