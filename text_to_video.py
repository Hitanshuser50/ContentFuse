import torch
from diffusers import DiffusionPipeline
from diffusers.utils import export_to_video
import os
import gc
import psutil
import sys
import shutil

def check_memory():
    memory = psutil.virtual_memory()
    print(f"Available memory: {memory.available / (1024**3):.2f} GB")
    print(f"Total memory: {memory.total / (1024**3):.2f} GB")
    return memory.available

def clear_cache():
    # Clear Python garbage
    gc.collect()
    
    # Clear PyTorch cache
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # Clear Hugging Face cache if it exists
    cache_dir = os.path.expanduser("~/.cache/huggingface")
    if os.path.exists(cache_dir):
        try:
            shutil.rmtree(cache_dir)
        except:
            pass

def generate_video(prompt: str, output_path: str = "output.mp4"):
    # Force CPU usage
    device = "cpu"
    print("Using CPU for generation")
    
    # Check available memory
    available_memory = check_memory()
    if available_memory < 8 * 1024**3:  # Less than 8GB available
        print("Warning: Low memory available. Results may be unstable.")
    
    # Clear all caches
    clear_cache()
    
    pipe = None
    try:
        # Load the model with minimal memory usage
        pipe = DiffusionPipeline.from_pretrained(
            "damo-vilab/text-to-video-ms-1.7b",
            torch_dtype=torch.float32,
            use_safetensors=True,
            low_cpu_mem_usage=True,
            device_map="balanced"
        )
        
        # Move model to CPU
        pipe = pipe.to(device)
        
        # Reduce memory usage
        pipe.enable_attention_slicing()
        pipe.enable_vae_slicing()
        pipe.enable_sequential_cpu_offload()
        
        # Generate video with minimal parameters
        print(f"Generating video for prompt: {prompt}")
        frames = pipe(
            prompt,
            num_frames=4,  # Minimal number of frames
            num_inference_steps=10,  # Minimal steps
            guidance_scale=7.5,
            width=256,  # Minimal resolution
            height=144,  # Minimal resolution
            fps=4,  # Lower FPS
            seed=0
        ).frames[0]
        
        # Save the video
        export_to_video(frames, output_path, fps=4)
        print(f"Video saved to: {output_path}")
        
    except Exception as e:
        print(f"Error during video generation: {str(e)}")
        if "paging file" in str(e):
            print("\nWindows Paging File Error Detected!")
            print("Please try the following solutions:")
            print("1. Increase your Windows paging file size:")
            print("   - Open System Properties")
            print("   - Go to Advanced > Performance Settings")
            print("   - Click 'Change' under Virtual Memory")
            print("   - Set a larger size (recommended: 1.5x your RAM)")
            print("2. Close other memory-intensive applications")
            print("3. Restart your computer to clear memory")
        raise e
    finally:
        # Clear memory
        if pipe is not None:
            del pipe
        clear_cache()

if __name__ == "__main__":
    # Example usage
    prompt = input("Enter your prompt: ")
    generate_video(prompt) 