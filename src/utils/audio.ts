import Taro from '@tarojs/taro'

type AudioCallbacks = {
  onEnded?: () => void
  onError?: (err: unknown) => void
}

/** 封装小程序 InnerAudioContext */
export class WordAudioPlayer {
  private ctx: Taro.InnerAudioContext | null = null
  private speed = 1

  ensureContext(): Taro.InnerAudioContext {
    if (!this.ctx) {
      this.ctx = Taro.createInnerAudioContext()
      this.ctx.obeyMuteSwitch = false
    }
    return this.ctx
  }

  setSpeed(speed: number): void {
    this.speed = speed
    if (this.ctx) {
      this.ctx.playbackRate = speed
    }
  }

  getSpeed(): number {
    return this.speed
  }

  play(src: string, callbacks?: AudioCallbacks): void {
    const ctx = this.ensureContext()
    ctx.stop()
    ctx.offEnded()
    ctx.offError()
    ctx.src = src
    ctx.playbackRate = this.speed
    if (callbacks?.onEnded) {
      ctx.onEnded(callbacks.onEnded)
    }
    if (callbacks?.onError) {
      ctx.onError(callbacks.onError)
    }
    ctx.play()
  }

  pause(): void {
    this.ctx?.pause()
  }

  resume(): void {
    this.ctx?.play()
  }

  stop(): void {
    this.ctx?.stop()
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.destroy()
      this.ctx = null
    }
  }
}
