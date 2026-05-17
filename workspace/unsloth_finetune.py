# Unsloth Fine-Tuning Script
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

print("""
ALL DONE!
Your custom fine-tuned GGUF model has been generated successfully in 'outputs/antigravity_gguf'!

How to load in Ollama:
1. Create a Modelfile:
   FROM ./outputs/antigravity_gguf/unsloth.q4_k_m.gguf
   SYSTEM "You are Antigravity Clone, fine-tuned on this codebase..."

2. Run in terminal:
   ollama create antigravity-custom -f Modelfile
""")
