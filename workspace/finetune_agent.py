import os
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer

# 1. LOAD MODEL AND TOKENIZER
model_id = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
print(f"Loading tokenizer for {model_id}...")
tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token

print(f"Loading model {model_id}...")
# Use CPU or GPU based on availability
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device locked to: {device.upper()}")

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float32,
    device_map="auto"
)

# 2. FORMAT AND TOKENIZE DATASET
prompt_template = """You are Antigravity Clone, the ultimate agentic programming AI.
### Instruction:
{}

### Input:
{}

### Response:
{}
"""

def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    inputs       = examples["input"]
    outputs      = examples["output"]
    texts = []
    for inst, inp, out in zip(instructions, inputs, outputs):
        text = prompt_template.format(inst, inp, out) + tokenizer.eos_token
        texts.append(text)
    return { "text" : texts }

print("Loading prepared training_dataset.json...")
dataset = load_dataset("json", data_files="training_dataset.json", split="train")
dataset = dataset.map(formatting_prompts_func, batched=True)

# Tokenize helper for standard Causal Language Modeling
def tokenize_function(examples):
    tokenized = tokenizer(examples["text"], truncation=True, max_length=512)
    # Causal LM requires input_ids to be copied as labels
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized

print("Tokenizing and mapping training tensors...")
tokenized_dataset = dataset.map(tokenize_function, batched=True, remove_columns=dataset.column_names)

# 3. SETUP TRAINING ARGUMENTS
print("Setting up training parameters...")
training_args = TrainingArguments(
    output_dir="./outputs/antigravity_model",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=2,
    learning_rate=2e-5,
    logging_steps=1,
    max_steps=5, # Short steps for fast validation loop
    weight_decay=0.01,
    fp16=False,
    bf16=False,
    remove_unused_columns=True,
    report_to="none"
)

# 4. START TRAINING (Using core rock-solid Trainer)
print("Starting Hugging Face Core Trainer loop...")
trainer = Trainer(
    model=model,
    train_dataset=tokenized_dataset,
    args=training_args,
)

trainer.train()

print("Saving fine-tuned model weights...")
trainer.model.save_pretrained("./outputs/antigravity_fine_tuned")
tokenizer.save_pretrained("./outputs/antigravity_fine_tuned")

print("""
===================================================
SUCCESS! Your private AI brain has been fine-tuned!
Weights saved to: ./outputs/antigravity_fine_tuned
===================================================
""")
