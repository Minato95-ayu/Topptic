import os
import json
import glob

# 1. GENERATING TRAINING DATASET FROM WORKSPACE FILES
print("[Unsloth Autotrain Pipeline] Scanning workspace files to generate dataset...")

training_data = []

# Scan for HTML, Python, JS files in the active workspace
workspace_dir = os.path.dirname(os.path.abspath(__file__))
file_patterns = [
    os.path.join(workspace_dir, "**/*.html"),
    os.path.join(workspace_dir, "**/*.py"),
    os.path.join(workspace_dir, "**/*.js"),
]

scanned_files = []
for pattern in file_patterns:
    scanned_files.extend(glob.glob(pattern, recursive=True))

# Skip the script itself and python cache
scanned_files = [f for f in scanned_files if not f.endswith("autotrain_agent.py") and not f.endswith("unsloth_finetune.py")]

if not scanned_files:
    print("[Warning] No workspace files found. Generating sample dataset...")
    training_data.append({
        "instruction": "Create a premium responsive HTML page with modern styling.",
        "input": "",
        "output": "<!DOCTYPE html>\n<html>\n<head>\n  <title>Premium Site</title>\n</head>\n<body>\n  <h1>Welcome Bhai</h1>\n</body>\n</html>"
    })
else:
    for file_path in scanned_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    filename = os.path.basename(file_path)
                    relative_path = os.path.relpath(file_path, workspace_dir)
                    training_data.append({
                        "instruction": f"Write the complete and highly optimized code for the file: {relative_path}",
                        "input": f"File name is {filename}",
                        "output": content
                    })
                    print(f"  -> Added {relative_path} to dataset.")
        except Exception as e:
            print(f"  -> Failed to read {file_path}: {e}")

dataset_path = os.path.join(workspace_dir, "training_dataset.json")
with open(dataset_path, "w", encoding="utf-8") as f:
    json.dump(training_data, f, indent=2)

print(f"Saved {len(training_data)} training pairs to {dataset_path}!")

# 2. THE UNSLOTH FINE-TUNING CORE
unsloth_script = """# Unsloth Fine-Tuning Script
# Run this on a GPU-enabled PC (e.g. RTX 3060/4060) to train your agent!

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

max_seq_length = 2048 # Supports RoPE Context scaling
dtype = None # None for auto detection. Float16 for Tesla T4, Bfloat16 for Ampere+
load_in_4bit = True # Use 4bit quantization to fit on low VRAM (under 8GB)

# Load Qwen2.5-Coder base model
print("Loading base model Qwen2.5-Coder-7B in 4-bit...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen2.5-Coder-7B-Instruct-bnb-4bit",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

# Apply QLoRA adapters for efficient parameter updates
print("Setting up LoRA configuration...")
model = FastLanguageModel.get_peft_model(
    model,
    r = 16, # Rank
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha = 16,
    lora_dropout = 0, # Optimized to 0 for Unsloth
    bias = "none",    # Optimized to none
    use_gradient_checkpointing = "unsloth", # 30% less memory usage
    random_state = 3407,
    use_rslora = False,
    loftq_config = None,
)

# Format the dataset using Instruct patterns
prompt_template = \"\"\"You are Antigravity Clone, the ultimate agentic programming AI.
### Instruction:
{}

### Input:
{}

### Response:
{}
\"\"\"

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
dataset = dataset.map(formatting_prompts_func, batched = True)

# Set up Trainer
trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False, # Can speed up training for short sequences
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 60, # Small steps for local codebase alignment
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

# Run training
print("Starting fine-tuning training loop...")
trainer_stats = trainer.train()

print("Training complete! Saving LoRA adapters...")
model.save_pretrained_merged("outputs/antigravity_adapter", tokenizer, merge_method = "lora")

# Save as GGUF format for Ollama
print("Exporting model to GGUF format...")
model.save_pretrained_gguf("outputs/antigravity_gguf", tokenizer, quantization_method = "q4_k_m")

print(\"\"\"
ALL DONE!
Your custom fine-tuned GGUF model has been generated successfully in 'outputs/antigravity_gguf'!

How to load in Ollama:
1. Create a Modelfile:
   FROM ./outputs/antigravity_gguf/unsloth.q4_k_m.gguf
   SYSTEM \"You are Antigravity Clone, fine-tuned on this codebase...\"

2. Run in terminal:
   ollama create antigravity-custom -f Modelfile
\"\"\")
"""

with open(os.path.join(workspace_dir, "unsloth_finetune.py"), "w", encoding="utf-8") as f:
    f.write(unsloth_script)

print("Saved ready-to-run training script to: unsloth_finetune.py!")
print("Run 'pip install unsloth xformers trl' then run 'python unsloth_finetune.py' to fine-tune your agent!")
