export class GameplayCam {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public isSupported(): boolean {
    return typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in this.canvas && typeof MediaRecorder !== 'undefined';
  }

  public startRecording(): void {
    if (!this.isSupported()) {
      console.warn('Gameplay Cam recording is not supported in this browser environment.');
      return;
    }

    this.recordedChunks = [];
    try {
      const stream = this.canvas.captureStream(30); // 30 FPS
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? { mimeType: 'video/webm;codecs=vp9' }
        : MediaRecorder.isTypeSupported('video/webm')
        ? { mimeType: 'video/webm' }
        : undefined;

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect slice every 100ms
    } catch (e) {
      console.error('Failed to start Gameplay Cam recording:', e);
    }
  }

  public stopAndDownload(filename: string = 'gamio-gameplay-clip.webm'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve();
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve();
          }, 100);
        } catch (err) {
          console.error('Error saving Gameplay Cam clip:', err);
          resolve();
        }
      };

      this.mediaRecorder.stop();
    });
  }
}
