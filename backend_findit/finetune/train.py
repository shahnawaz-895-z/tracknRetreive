from transformers import GitForCausalLM, Trainer, TrainingArguments
from config import GIT_CONFIG
from data_loader import load_flickr8k
import torch

def finetune_git_flickr8k():
    config = GIT_CONFIG
    model = GitForCausalLM.from_pretrained(config["model_name"])
    dataset = load_flickr8k(config)

    training_args = TrainingArguments(
        output_dir=config["output_dir"],
        evaluation_strategy="epoch",
        per_device_train_batch_size=config["batch_size"],
        per_device_eval_batch_size=config["batch_size"],
        num_train_epochs=config["epochs"],
        learning_rate=config["learning_rate"],
        save_strategy="epoch",
        logging_steps=100,
        remove_unused_columns=False,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset[config["train_split"]],
        eval_dataset=dataset[config["val_split"]]
    )

    trainer.train()
    trainer.save_model(f"{config['output_dir']}/best_model")

if __name__ == "__main__":
    finetune_git_flickr8k()