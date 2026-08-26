#!/usr/bin/env python3
"""Min Trener — pilot-batch mot kitor over HTTPS (produksjonsmønsteret).

3 ovelser x 3 seeds, Flux + astrid_k + OpenPose-ControlNet, med
arbiter-lease (acquire/heartbeat/release) via HTTP-API-et.
Token leses fra ../.env (KITOR_TOKEN). Se docs/kitor-bildepipeline-funn-2026-08-26.md.
"""
import json, time, threading, urllib.request, urllib.error
from pathlib import Path

BASE = "https://kitor.tail49f298.ts.net"
LORA = "synthiq/astrid_k.safetensors"
CN = "flux1-dev-controlnet-union-pro-2.0.safetensors"
W, H, STEPS = 896, 1152, 24

TOKEN = None
for line in (Path(__file__).parent.parent / ".env").read_text().splitlines():
    if line.startswith("KITOR_TOKEN="):
        TOKEN = line.split("=", 1)[1].strip()
assert TOKEN, "KITOR_TOKEN mangler i .env"
HDR = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def api(path, payload=None, timeout=60):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HDR)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


# (navn, skjelett-fil i ComfyUI input/, pose- og håndbeskrivelse)
EXERCISES = [
    ("squat", "mintrener_pose_squat.png",
     "doing a deep bodyweight squat, thighs parallel to the floor, "
     "hands resting on the hips, fingers together"),
    ("lunge", "mintrener_pose_lunge.png",
     "doing a forward lunge, front knee bent at 90 degrees, "
     "arms relaxed at the sides, hands in loose fists"),
    ("kbswing", "mintrener_pose_swing.png",
     "swinging a kettlebell, hip hinge at the bottom of the swing, torso "
     "leaning forward, arms straight, both hands in a firm overlapping grip "
     "around the kettlebell handle"),
]

TMPL = ("ASTRID, a woman, photorealistic photo of a fit athletic woman {pose}, "
        "in a bright modern gym, wearing a charcoal fitted sports bra and "
        "charcoal high-waist leggings, black training shoes, natural lighting, "
        "sharp focus, full body, side view")


def build(seed, skel, pose, prefix):
    return {"prompt": {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn"}},
        "lora": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["unet", 0], "lora_name": LORA, "strength_model": 1.0}},
        "dclip": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["dclip", 0], "text": TMPL.format(pose=pose)}},
        "flux": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["pos", 0], "guidance": 3.5}},
        "neg": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["dclip", 0], "text": ""}},
        "skel": {"class_type": "LoadImage", "inputs": {"image": skel}},
        "cnload": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": CN}},
        "cntype": {"class_type": "SetUnionControlNetType", "inputs": {"control_net": ["cnload", 0], "type": "openpose"}},
        "cnapply": {"class_type": "ControlNetApplyAdvanced", "inputs": {"positive": ["flux", 0], "negative": ["neg", 0], "control_net": ["cntype", 0], "image": ["skel", 0], "strength": 0.9, "start_percent": 0.0, "end_percent": 0.65, "vae": ["vae", 0]}},
        "lat": {"class_type": "EmptySD3LatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
        "ks": {"class_type": "KSampler", "inputs": {"model": ["lora", 0], "positive": ["cnapply", 0], "negative": ["cnapply", 1], "latent_image": ["lat", 0], "seed": seed, "steps": STEPS, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "dec": {"class_type": "VAEDecode", "inputs": {"samples": ["ks", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["dec", 0], "filename_prefix": prefix}},
    }}


def wait_done(pid, timeout=900):
    s = time.time()
    while time.time() - s < timeout:
        try:
            h = api(f"/comfy-mintrener/history/{pid}")
            if pid in h:
                if h[pid].get("status", {}).get("status_str") == "error":
                    print("EXEC ERROR:", json.dumps(h[pid]["status"])[:600], flush=True)
                    return False
                return True
        except Exception:
            pass
        time.sleep(3)
    return False


def main():
    lease = api("/arbiter/acquire", {"kind": "image", "requester": "mintrener",
                                     "label": "pilot 3x3 exercise-illustrations",
                                     "duration_h": 1}, timeout=3600)
    token = lease["token"]
    print("lease:", token, "wait_s:", lease.get("wait_s"), flush=True)

    stop = threading.Event()

    def heartbeat():
        while not stop.wait(300):
            try:
                api("/arbiter/heartbeat", {"token": token})
                print("  (heartbeat ok)", flush=True)
            except Exception as e:
                print("  (heartbeat FEIL:", e, ")", flush=True)

    threading.Thread(target=heartbeat, daemon=True).start()

    try:
        for name, skel, pose in EXERCISES:
            for j in range(3):
                seed = 70000 + EXERCISES.index((name, skel, pose)) * 100 + j
                prefix = f"mintrener/pilot__{name}_seed{j}"
                t0 = time.time()
                pid = api("/comfy-mintrener/prompt", build(seed, skel, pose, prefix))["prompt_id"]
                ok = wait_done(pid)
                print(f"  {name} seed{j}: {'ok' if ok else 'FAIL'} ({time.time()-t0:.0f}s)", flush=True)
    finally:
        stop.set()
        try:
            api("/arbiter/release", {"token": token})
            print("released.", flush=True)
        except Exception as e:
            print("RELEASE FEILET — rydd manuelt:", e, flush=True)


if __name__ == "__main__":
    main()
