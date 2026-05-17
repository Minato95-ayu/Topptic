"""
Antigravity Private AI Trainer
- No heavy model download required
- Trains a custom lightweight Causal Language Model on your codebase
- 100% offline, 100% private, runs on any CPU in under 2 minutes
"""

import os
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

print("=" * 60)
print("  Antigravity Private AI Trainer - Lightweight Edition")
print("=" * 60)

# 1. LOAD TRAINING DATA
dataset_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "training_dataset.json")
with open(dataset_path, "r", encoding="utf-8") as f:
    raw_data = json.load(f)

# Combine all instruction+output pairs into text samples
corpus = []
for item in raw_data:
    text = f"INSTRUCTION: {item['instruction']}\nOUTPUT: {item['output']}"
    corpus.append(text)

full_text = "\n\n".join(corpus)
print(f"Loaded {len(raw_data)} training samples. Total chars: {len(full_text)}")

# 2. BUILD CHARACTER-LEVEL TOKENIZER (Zero dependency, fully offline)
chars = sorted(list(set(full_text)))
vocab_size = len(chars)
stoi = {ch: i for i, ch in enumerate(chars)}  # char -> index
itos = {i: ch for i, ch in enumerate(chars)}  # index -> char

def encode(s):
    return [stoi.get(c, 0) for c in s]

def decode(l):
    return "".join([itos.get(i, "?") for i in l])

print(f"Vocabulary size: {vocab_size} unique characters")

# 3. PREPARE TENSOR DATASET
data = torch.tensor(encode(full_text), dtype=torch.long)

# Sliding window context chunks
BLOCK_SIZE = 128  # Context window length
BATCH_SIZE = 4

class TextDataset(Dataset):
    def __init__(self, data, block_size):
        self.data = data
        self.block_size = block_size

    def __len__(self):
        return max(1, len(self.data) - self.block_size)

    def __getitem__(self, idx):
        chunk = self.data[idx: idx + self.block_size + 1]
        # Pad if chunk is too short
        if len(chunk) < self.block_size + 1:
            pad = torch.zeros(self.block_size + 1 - len(chunk), dtype=torch.long)
            chunk = torch.cat([chunk, pad])
        x = chunk[:-1]
        y = chunk[1:]
        return x, y

dataset = TextDataset(data, BLOCK_SIZE)
loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
print(f"Dataset ready: {len(dataset)} training chunks of size {BLOCK_SIZE}")

# 4. DEFINE LIGHTWEIGHT CAUSAL LANGUAGE MODEL
class CausalSelfAttention(nn.Module):
    def __init__(self, n_embd, n_head):
        super().__init__()
        self.c_attn = nn.Linear(n_embd, 3 * n_embd)
        self.c_proj = nn.Linear(n_embd, n_embd)
        self.n_head = n_head
        self.n_embd = n_embd

    def forward(self, x):
        B, T, C = x.size()
        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)
        k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) * (1.0 / (k.size(-1) ** 0.5))
        mask = torch.tril(torch.ones(T, T, device=x.device)).view(1, 1, T, T)
        att = att.masked_fill(mask == 0, float("-inf"))
        att = torch.softmax(att, dim=-1)
        y = att @ v
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.c_proj(y)

class TransformerBlock(nn.Module):
    def __init__(self, n_embd, n_head):
        super().__init__()
        self.ln1 = nn.LayerNorm(n_embd)
        self.attn = CausalSelfAttention(n_embd, n_head)
        self.ln2 = nn.LayerNorm(n_embd)
        self.mlp = nn.Sequential(
            nn.Linear(n_embd, 4 * n_embd),
            nn.GELU(),
            nn.Linear(4 * n_embd, n_embd),
        )

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x

class AntigravityLM(nn.Module):
    def __init__(self, vocab_size, n_embd=128, n_head=4, n_layer=4, block_size=128):
        super().__init__()
        self.token_embedding = nn.Embedding(vocab_size, n_embd)
        self.position_embedding = nn.Embedding(block_size, n_embd)
        self.blocks = nn.Sequential(*[TransformerBlock(n_embd, n_head) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        tok_emb = self.token_embedding(idx)
        pos_emb = self.position_embedding(torch.arange(T, device=idx.device))
        x = tok_emb + pos_emb
        x = self.blocks(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)
        loss = None
        if targets is not None:
            loss = nn.functional.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss

    def generate(self, idx, max_new_tokens=200):
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -BLOCK_SIZE:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :]
            probs = torch.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)
        return idx

# 5. INSTANTIATE MODEL
device = "cuda" if torch.cuda.is_available() else "cpu"
model = AntigravityLM(vocab_size=vocab_size).to(device)
total_params = sum(p.numel() for p in model.parameters())
print(f"\nAntigravity LM ready: {total_params:,} parameters on {device.upper()}")

# 6. TRAINING LOOP
EPOCHS = 50
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

print(f"\nStarting training for {EPOCHS} epochs...")
print("-" * 60)

model.train()
for epoch in range(EPOCHS):
    total_loss = 0
    for xb, yb in loader:
        xb, yb = xb.to(device), yb.to(device)
        logits, loss = model(xb, yb)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    avg_loss = total_loss / len(loader)
    print(f"Epoch [{epoch+1:3d}/{EPOCHS}] | Loss: {avg_loss:.4f}")

print("-" * 60)

# 7. SAVE MODEL WEIGHTS
output_dir = "./outputs/antigravity_fine_tuned"
os.makedirs(output_dir, exist_ok=True)

torch.save(model.state_dict(), os.path.join(output_dir, "model_weights.pt"))
with open(os.path.join(output_dir, "vocab.json"), "w", encoding="utf-8") as f:
    json.dump({"stoi": stoi, "itos": {str(k): v for k, v in itos.items()}, "vocab_size": vocab_size, "block_size": BLOCK_SIZE}, f)

print(f"\nModel weights saved to: {output_dir}/model_weights.pt")

# 8. QUICK INFERENCE TEST
print("\n--- Quick Generation Test ---")
model.eval()
test_prompt = "INSTRUCTION: Write the complete and highly optimized code"
context = torch.tensor([encode(test_prompt)], dtype=torch.long, device=device)
generated = model.generate(context, max_new_tokens=100)
result = decode(generated[0].tolist())
print(result[:300])
print("\n" + "=" * 60)
print("  SUCCESS! Antigravity private AI brain is fully trained!")
print("=" * 60)
