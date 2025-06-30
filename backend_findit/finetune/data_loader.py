import os
import json
from PIL import Image
import torch
from torch.utils.data import Dataset
from transformers import GitProcessor

class Flickr8kDataset(Dataset):
    def __init__(self, config, split="train"):
        self.config = config
        self.split = split
        self.processor = GitProcessor.from_pretrained(config["model_name"])
        
        # Load captions (assumes captions are in a JSON file)
        with open(f"data/flickr8k/captions_{split}.json", "r") as f:
            self.captions = json.load(f)
        
        # Image directory
        self.image_dir = "data/flickr8k/images"

    def __len__(self):
        return len(self.captions)

    def __getitem__(self, idx):
        item = self.captions[idx]
        image_path = os.path.join(self.image_dir, item["image_path"])
        caption = item["caption"]
        
        # Load and preprocess image
        image = Image.open(image_path).convert("RGB")
        
        # Process image + text
        inputs = self.processor(
            images=image,
            text=caption,
            padding="max_length",
            max_length=self.config["max_length"],
            truncation=True,
            return_tensors="pt"
        )
        
        return {
            "pixel_values": inputs["pixel_values"].squeeze(),
            "input_ids": inputs["input_ids"].squeeze(),
            "attention_mask": inputs["attention_mask"].squeeze()
        }

def get_flickr8k_loaders(config):
    train_dataset = Flickr8kDataset(config, "train")
    val_dataset = Flickr8kDataset(config, "val")
    test_dataset = Flickr8kDataset(config, "test")
    
    train_loader = torch.utils.data.DataLoader(
        train_dataset,
        batch_size=config["batch_size"],
        shuffle=True
    )
    val_loader = torch.utils.data.DataLoader(
        val_dataset,
        batch_size=config["batch_size"],
        shuffle=False
    )
    test_loader = torch.utils.data.DataLoader(
        test_dataset,
        batch_size=config["batch_size"],
        shuffle=False
    )
    
    return train_loader, val_loader, test_loader