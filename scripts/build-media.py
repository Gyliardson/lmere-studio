import os
import subprocess
import glob

def find_raw_videos():
    raw_dir = os.path.abspath(".tmp/raw_videos")
    files = glob.glob(os.path.join(raw_dir, "*.webm"))
    
    mobile_file = None
    desktop_file = None
    
    for f in files:
        if "mobile" in f.lower():
            mobile_file = f
        elif "desktop" in f.lower():
            desktop_file = f
            
    if not mobile_file or not desktop_file:
        files.sort(key=os.path.getmtime)
        if len(files) >= 2:
            mobile_file = files[0]
            desktop_file = files[1]
            
    return mobile_file, desktop_file

def build_intermediate_video(video_in, audio_narr, srt_sub, temp_out, is_mobile=False):
    output_dir = os.path.dirname(temp_out)
    rel_srt = os.path.relpath(srt_sub, output_dir).replace("\\", "/")
    
    print(f"[BUILD] Rendering intermediate {os.path.basename(temp_out)}...")
    
    if is_mobile:
        v_filter = (
            f"[0:v]scale=375*1080/812:1080,pad=1920:1080:(1920-iw)/2:(1080-ih)/2:color=0x0F0A1A,setsar=1,"
            f"fps=60,subtitles=filename='{rel_srt}':force_style='Fontname=Arial,Fontsize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,BorderStyle=4,MarginV=35'[vfinal]"
        )
    else:
        v_filter = (
            f"[0:v]scale=1920:1080,setsar=1,"
            f"fps=60,subtitles=filename='{rel_srt}':force_style='Fontname=Arial,Fontsize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&H80000000,BorderStyle=4,MarginV=35'[vfinal]"
        )
        
    cmd = [
        "ffmpeg", "-y",
        "-i", video_in,
        "-i", audio_narr,
        "-filter_complex", f"{v_filter}",
        "-map", "[vfinal]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192000",
        "-shortest",
        os.path.basename(temp_out)
    ]
    
    subprocess.run(cmd, cwd=output_dir, check=True)
    print(f"[OK] Intermediate rendered: {temp_out}")

def add_bgm(video_in, bgm_audio, video_out):
    output_dir = os.path.dirname(video_out)
    cmd = [
        "ffmpeg", "-y",
        "-i", video_in,
        "-i", bgm_audio,
        "-filter_complex", "[0:a]volume=1.0[anarr];[1:a]volume=0.35[abgm];[anarr][abgm]amix=inputs=2:duration=first:dropout_transition=2[afinal]",
        "-map", "0:v",
        "-map", "[afinal]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192000",
        os.path.basename(video_out)
    ]
    subprocess.run(cmd, cwd=output_dir, check=True)
    print(f"[OK] Added BGM to: {video_out}")

def build_combined_intermediate(mobile_temp, desktop_temp, combined_temp):
    output_dir = os.path.dirname(combined_temp)
    # Use concat demuxer for files with exact same streams (h264 + aac)
    concat_list = os.path.join(output_dir, "concat_list.txt")
    with open(concat_list, "w") as f:
        f.write(f"file '{os.path.basename(mobile_temp)}'\n")
        f.write(f"file '{os.path.basename(desktop_temp)}'\n")
        
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "concat_list.txt",
        "-c", "copy",
        os.path.basename(combined_temp)
    ]
    subprocess.run(cmd, cwd=output_dir, check=True)
    os.remove(concat_list)
    print(f"[OK] Combined intermediate created: {combined_temp}")

def build_clean_gif(raw_video_in, gif_out, duration=10.0, is_mobile=False):
    output_dir = os.path.dirname(gif_out)
    print(f"[BUILD] Rendering clean preview GIF without subtitles: {os.path.basename(gif_out)}...")
    palette_png = os.path.join(output_dir, f"palette_{os.path.basename(gif_out)}.png")
    
    if is_mobile:
        vf_scale = "fps=15,scale=320:-1:flags=lanczos"
    else:
        vf_scale = "fps=15,scale=640:-1:flags=lanczos"
        
    cmd_palette = [
        "ffmpeg", "-y",
        "-ss", "2", "-t", str(duration),
        "-i", raw_video_in,
        "-vf", f"{vf_scale},palettegen",
        os.path.basename(palette_png)
    ]
    subprocess.run(cmd_palette, cwd=output_dir, check=True)
    
    cmd_gif = [
        "ffmpeg", "-y",
        "-ss", "2", "-t", str(duration),
        "-i", raw_video_in,
        "-i", os.path.basename(palette_png),
        "-filter_complex", f"{vf_scale}[x];[x][1:v]paletteuse",
        os.path.basename(gif_out)
    ]
    subprocess.run(cmd_gif, cwd=output_dir, check=True)
    
    if os.path.exists(palette_png):
        os.remove(palette_png)
    print(f"[OK] Rendered clean GIF: {gif_out}")

def main():
    output_dir = os.path.abspath(".tmp/output")
    audio_dir = os.path.abspath(".tmp/audio")
    os.makedirs(output_dir, exist_ok=True)
    
    mobile_vid, desktop_vid = find_raw_videos()
    if not mobile_vid or not desktop_vid:
        raise RuntimeError("Could not find raw video recordings in .tmp/raw_videos/")
        
    mob_audio = os.path.join(audio_dir, "mobile_full_narration.mp3")
    desk_audio = os.path.join(audio_dir, "desktop_full_narration.mp3")
    mob_srt = os.path.join(audio_dir, "mobile_subtitles.srt")
    desk_srt = os.path.join(audio_dir, "desktop_subtitles.srt")
    bgm_audio = os.path.join(audio_dir, "bgm.mp3")
    
    mob_temp = os.path.join(output_dir, "temp_mob.mp4")
    desk_temp = os.path.join(output_dir, "temp_desk.mp4")
    combined_temp = os.path.join(output_dir, "temp_combined.mp4")
    
    mob_out = os.path.join(output_dir, "lmere-studio-mobile-demo.mp4")
    desk_out = os.path.join(output_dir, "lmere-studio-desktop-demo.mp4")
    combined_out = os.path.join(output_dir, "lmere-studio-demo.mp4")
    
    mob_gif = os.path.join(output_dir, "demo-preview-mobile.gif")
    desk_gif = os.path.join(output_dir, "demo-preview-desktop.gif")
    combined_gif = os.path.join(output_dir, "demo-preview.gif")
    
    # Render MP4 Intermediates (Video + Voice + Subs, trimmed by -shortest)
    build_intermediate_video(mobile_vid, mob_audio, mob_srt, mob_temp, is_mobile=True)
    build_intermediate_video(desktop_vid, desk_audio, desk_srt, desk_temp, is_mobile=False)
    
    # Combine Intermediates
    build_combined_intermediate(mob_temp, desk_temp, combined_temp)
    
    # Add BGM
    add_bgm(mob_temp, bgm_audio, mob_out)
    add_bgm(desk_temp, bgm_audio, desk_out)
    add_bgm(combined_temp, bgm_audio, combined_out)
    
    # Cleanup Intermediates
    if os.path.exists(mob_temp): os.remove(mob_temp)
    if os.path.exists(desk_temp): os.remove(desk_temp)
    if os.path.exists(combined_temp): os.remove(combined_temp)
    
    # Render Clean GIFs WITHOUT Subtitles for README documentation!
    build_clean_gif(mobile_vid, mob_gif, duration=10.0, is_mobile=True)
    build_clean_gif(desktop_vid, desk_gif, duration=10.0, is_mobile=False)
    build_clean_gif(desktop_vid, combined_gif, duration=10.0, is_mobile=False)

if __name__ == "__main__":
    main()
