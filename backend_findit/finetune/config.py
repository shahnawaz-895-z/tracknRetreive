GIT_CONFIG = {
    "model_name": "microsoft/git-base",
    "dataset_name": "Flickr8k",
    "image_size": 224,
    "max_length": 64,  # Optimal for Flickr8k captions
    "batch_size": 32,
    "epochs": 20,  # Flickr8k benefits from slightly longer training
    "learning_rate": 3e-5,
    "output_dir": "output/git_finetuned_flickr8k",
    "train_split": "train",
    "val_split": "val",
    "test_split": "test"
}