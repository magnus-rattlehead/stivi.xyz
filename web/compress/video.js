import {
  Input, BlobSource, ALL_FORMATS, Output, BufferTarget, Mp4OutputFormat,
  Conversion, Quality, canEncodeVideo, canEncodeAudio,
} from './vendor/mediabunny/mediabunny.min.mjs';

export const codecNames = { av1: 'AV1', hevc: 'HEVC', avc: 'H.264' };

export class VideoProcessor {
  constructor(file) {
    this.file = file;
    this.input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  }

  async inspect() {
    const video = await this.input.getPrimaryVideoTrack();
    if (!video) throw new Error('This file has no video track.');
    this.video = video;
    this.audio = await this.input.getPrimaryAudioTrack();
    const color = await video.getColorSpace();
    const codec = await video.getCodecParameterString();
    if (['smpte2084', 'arib-std-b67'].includes(color.transfer) || /^dv(h[1e]|av|a1)/i.test(codec || '')) {
      throw new Error('HDR video is not supported yet.');
    }
    if (!await video.canDecode()) throw new Error('This video cannot be processed on this device.');
    const tracks = [video, ...(this.audio ? [this.audio] : [])];
    const first = Math.max(0, await this.input.getFirstTimestamp(tracks));
    const end = await this.input.computeDuration(tracks);
    const duration = end - first;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('The video duration could not be read.');
    const stats = await video.computePacketStats(120);
    const width = await video.getDisplayWidth();
    const height = await video.getDisplayHeight();
    if (width < 2 || height < 2) throw new Error('This video is too small to encode.');
    const sourceBitrate = await video.getAverageBitrate();
    const channels = this.audio ? Math.min(2, await this.audio.getNumberOfChannels()) : 0;
    this.metadata = {
      width, height, duration, first, end,
      fps: Number.isFinite(stats.averagePacketRate) && stats.averagePacketRate > 0 ? stats.averagePacketRate : 30,
      bitrate: sourceBitrate || Math.max(1000, this.file.size * 8 / duration - (this.audio ? 128000 : 0)),
      hasAudio: !!this.audio, channels,
    };
    return this.metadata;
  }

  configuration(settings) {
    const meta = this.metadata;
    const scale = settings.maxDimension ? Math.min(1, settings.maxDimension / Math.max(meta.width, meta.height)) : 1;
    // Even dimensions work with 4:2:0 encoders; contain preserves the source aspect ratio.
    const width = Math.max(2, Math.floor(meta.width * scale / 2) * 2);
    const height = Math.max(2, Math.floor(meta.height * scale / 2) * 2);
    const frameRate = settings.fps ? Math.min(settings.fps, meta.fps) : undefined;
    return { width, height, frameRate, quality: new Quality({ bitrate: settings.bitrate }) };
  }

  async selectCodec(settings) {
    const config = this.configuration(settings);
    for (const codec of settings.compatibility ? ['avc'] : ['av1', 'hevc', 'avc']) {
      if (await canEncodeVideo(codec, { ...config, frameRate: config.frameRate || this.metadata.fps })) return codec;
    }
    throw new Error('These video settings cannot be encoded on this device.');
  }

  async convert(settings, { signal, onProgress, sampleStart = null }) {
    signal.throwIfAborted();
    const codec = await this.selectCodec(settings);
    signal.throwIfAborted();
    const config = this.configuration(settings);
    const keepAudio = settings.audio && this.metadata.hasAudio;
    const audio = {
      codec: 'aac', quality: new Quality({ bitrate: settings.audioBitrate }),
      sampleRate: 48000, numberOfChannels: this.metadata.channels || 2, forceTranscode: true,
    };
    if (keepAudio && (!await this.audio.canDecode() || !await canEncodeAudio('aac', audio))) {
      throw new Error('Audio cannot be processed on this device. Uncheck Keep audio to make a silent video.');
    }
    signal.throwIfAborted();
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
    const sample = sampleStart !== null;
    const start = this.metadata.first + Math.min(Math.max(0, sampleStart || 0), Math.max(0, this.metadata.duration - 0.1));
    const trim = sample ? { start, end: Math.min(this.metadata.end, start + 3) } : undefined;
    let conversion;
    let canvas;
    const abort = () => { conversion?.cancel().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      conversion = await Conversion.init({
        input: this.input, output, tracks: 'primary', copy: false, tags: {}, trim, showWarnings: false,
        video: {
          ...config, codec, fit: 'contain', forceTranscode: true, allowTransformationMetadata: false,
          // Materialize SDR RGB pixels so the encoder receives an 8-bit surface.
          process: (frame) => {
            signal.throwIfAborted();
            canvas ??= new OffscreenCanvas(config.width, config.height);
            const context = canvas.getContext('2d', { colorSpace: 'srgb' });
            frame.draw(context, 0, 0, config.width, config.height);
            return canvas;
          },
        },
        audio: keepAudio ? audio : { discard: true },
      });
      signal.throwIfAborted();
      const missingTrack = conversion.discardedTracks.some(({ track }) =>
        track.type === 'video' || (keepAudio && track.type === 'audio'));
      if (!conversion.isValid || missingTrack) throw new Error('The video and audio could not be encoded with these settings.');
      conversion.onProgress = onProgress;
      await conversion.execute();
      signal.throwIfAborted();
      return {
        blob: new Blob([target.buffer], { type: 'video/mp4' }),
        width: config.width, height: config.height, codec,
        sample, duration: sample ? trim.end - trim.start : this.metadata.duration,
      };
    } catch (error) {
      if (conversion) await conversion.cancel().catch(() => {});
      else await output.cancel().catch(() => {});
      if (signal.aborted) signal.throwIfAborted();
      throw error;
    } finally {
      signal.removeEventListener('abort', abort);
      if (canvas) canvas.width = canvas.height = 1;
    }
  }

  dispose() { this.input.dispose(); }
}
