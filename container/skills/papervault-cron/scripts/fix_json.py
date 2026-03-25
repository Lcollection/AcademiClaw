import json

config = {
    "keywords": [
        "agent",
        "memory",
        "world model",
        "grounding",
        "planning",
        "reasoning",
        "chain-of-thought",
        "ReAct",
        "rag",
        "retrieval",
        "distributed training",
        "inference optimization",
        "quantization",
        "distillation",
        "fine-tuning",
        "prompt engineering",
        "peft",
        "lora",
        "vllm",
        "flashattention",
        "moe",
        "mixture of experts"
    ],
    "max_papers_per_day": 15,
    "auto_import": True,
    "notes": "关键词聚焦智能体、推理、基础设施优化"
}

with open(r"D:\PaperVault\config\keywords.json", "w", encoding="utf-8") as f:
    json.dump(config, f, ensure_ascii=False, indent=2)
    
print("Config saved successfully!")
