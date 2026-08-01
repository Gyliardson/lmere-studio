import os
import subprocess
import json

MOBILE_SCRIPT = [
    "Esta é a tela do cliente no L'Mere Studio. Uma vitrine mobile intuitiva e elegante para a sua confeitaria.",
    "No primeiro passo, o cliente escolhe a data da festa navegando pelo calendário interativo do ateliê.",
    "No segundo passo, seleciona o tamanho do bolo. O sistema exibe o rendimento de fatias, peso estimado e valor base.",
    "Na etapa de sabores, escolhe a massa e combina os recheios gourmet com fotos em alta definição.",
    "Em seguida, escreve a mensagem do topo do bolo, insere observações e anexa a foto de inspiração.",
    "Por fim, o sistema calcula o valor do sinal de 50 por cento, exibe a chave Pix e permite enviar o pedido no WhatsApp em um clique."
]

DESKTOP_SCRIPT = [
    "Bem-vindo ao Painel Administrativo do L'Mere Studio, o CMS completo para gerenciar a sua confeitaria.",
    "Na gestão de pedidos, acompanhe os orçamentos em colunas Kanban por status: pendente, aprovado, em produção, pronto e entregue.",
    "Na aba de cardápio, navegue pelos tamanhos, massas e recheios. Você pode editar valores, descrições e fotos a qualquer momento.",
    "O módulo de agenda permite visualizar a lotação diária e bloquear datas esgotadas com apenas um clique.",
    "Na personalização da marca, altere as cores primárias do ateliê com pré-visualização em tempo real.",
    "E na aba de recursos, defina o percentual do sinal Pix, regras de envio e campos personalizados do seu ateliê."
]

VOICE = "pt-BR-FranciscaNeural"

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(res.stdout.strip())

def format_timestamp_srt(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

def generate_narration_set(prefix, script_lines, audio_dir):
    print(f"[INFO] Generating {prefix} narration with voice: {VOICE}")
    durations = []
    
    for idx, text in enumerate(script_lines, 1):
        mp3_path = os.path.join(audio_dir, f"{prefix}_part_{idx}.mp3")
        vtt_path = os.path.join(audio_dir, f"{prefix}_part_{idx}.vtt")
        
        cmd = [
            "edge-tts",
            "--voice", VOICE,
            "--text", text,
            "--write-media", mp3_path,
            "--write-subtitles", vtt_path
        ]
        subprocess.run(cmd, check=True)
        dur = get_audio_duration(mp3_path)
        durations.append(dur)
        print(f"[OK] {prefix}_part_{idx}.mp3 duration: {dur:.2f}s")
        
    concat_txt = os.path.join(audio_dir, f"{prefix}_concat.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for idx in range(1, len(script_lines) + 1):
            f.write(f"file '{prefix}_part_{idx}.mp3'\n")
            
    concat_cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", f"{prefix}_concat.txt", "-c", "copy", f"{prefix}_full_narration.mp3"
    ]
    subprocess.run(concat_cmd, cwd=audio_dir, check=True)
    
    master_srt = os.path.join(audio_dir, f"{prefix}_subtitles.srt")
    current_time = 0.0
    
    with open(master_srt, "w", encoding="utf-8") as f:
        for idx, (text, dur) in enumerate(zip(script_lines, durations), 1):
            start_str = format_timestamp_srt(current_time)
            end_time = current_time + dur
            end_str = format_timestamp_srt(end_time)
            
            f.write(f"{idx}\n")
            f.write(f"{start_str} --> {end_str}\n")
            f.write(f"{text}\n\n")
            
            current_time = end_time
            
    print(f"[OK] Master {prefix} subtitles generated: {master_srt}")
    return durations

def generate_background_music(audio_dir, duration=110.0):
    bgm_path = os.path.join(audio_dir, "bgm.mp3")
    print(f"[INFO] Generating melodic ambient background music track ({duration:.1f}s)...")
    
    # Warm Cmaj7 / Am7 ambient chime chord progression synthesizer expression
    synth_expr = (
        "0.04*sin(2*PI*261.63*t)*sin(2*PI*0.5*t) + "
        "0.03*sin(2*PI*329.63*t)*cos(2*PI*0.3*t) + "
        "0.03*sin(2*PI*392.00*t)*sin(2*PI*0.2*t) + "
        "0.02*sin(2*PI*523.25*t)*cos(2*PI*0.4*t) + "
        "0.015*sin(2*PI*659.25*t)*sin(2*PI*0.6*t)"
    )
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"aevalsrc={synth_expr}:s=24000:d={duration}",
        "-c:a", "libmp3lame", "-b:a", "192k", "bgm.mp3"
    ]
    subprocess.run(cmd, cwd=audio_dir, check=True)
    print(f"[OK] Background music created: {bgm_path}")

def main():
    audio_dir = os.path.abspath(".tmp/audio")
    os.makedirs(audio_dir, exist_ok=True)
    
    mob_durs = generate_narration_set("mobile", MOBILE_SCRIPT, audio_dir)
    desk_durs = generate_narration_set("desktop", DESKTOP_SCRIPT, audio_dir)
    
    timing_info = {
        "mobile": mob_durs,
        "desktop": desk_durs
    }
    with open(os.path.join(audio_dir, "timing.json"), "w", encoding="utf-8") as f:
        json.dump(timing_info, f, indent=2)
        
    total_dur = sum(mob_durs) + sum(desk_durs) + 15.0
    generate_background_music(audio_dir, total_dur)

if __name__ == "__main__":
    main()
