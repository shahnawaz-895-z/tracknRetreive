from transformers import GitForCausalLM, GitProcessor
from config import GIT_CONFIG
from data_loader import load_flickr8k
import torch

def evaluate_flickr8k():
    config = GIT_CONFIG
    processor = GitProcessor.from_pretrained(config["model_name"])
    model = GitForCausalLM.from_pretrained(f"{config['output_dir']}/best_model")
    dataset = load_flickr8k(config)[config["test_split"]]
    
    # Generate captions for first 10 test images
    for i in range(10):
        image = Image.open(dataset[i]["image_path"])
        inputs = processor(images=image, return_tensors="pt")
        generated_ids = model.generate(
            pixel_values=inputs.pixel_values,
            max_length=config["max_length"],
            num_beams=5
        )
        caption = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        print(f"Image {i+1}:")
        print(f"Generated: {caption}")
        print(f"Reference: {dataset[i]['caption']}\n")

if __name__ == "__main__":
    evaluate_flickr8k()