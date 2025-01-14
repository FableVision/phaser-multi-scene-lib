import Phaser from 'phaser';

export type Sound = Phaser.Sound.WebAudioSound;

export class AudioManager
{
    public globalSfx: Map<string, Sound>;
    private currentVOClip: Sound|null;
    private currentVOClips: Sound[]|null;
    private _sfxMuted: boolean;
    private _musicMuted: boolean;
    private _voMuted: boolean;
    private _allMuted: boolean;
    private musicClips: Sound[];
    private sfxClips: Set<Sound>;

    public get sfxMuted(): boolean { return this._sfxMuted; }
    public get musicMuted(): boolean { return this._musicMuted; }
    public get voMuted(): boolean { return this._voMuted; }
    public get allMuted(): boolean { return this._allMuted; }

    constructor ()
    {
        this.currentVOClip = null;
        this.currentVOClips = null;
        this._sfxMuted = false;
        this._musicMuted = false;
        this._voMuted = false;
        this._allMuted = false;

        this.musicClips = [];
        this.sfxClips = new Set();
        this.globalSfx = new Map();
    }

    public preloadGlobalSfx(scene: Phaser.Scene, sfx: Record<string, string[]>)
    {
        for (const name in sfx)
        {
            // put in a null value so that we can
            this.globalSfx.set(name, null as any);
            scene.load.audio(name, sfx[name]);
        }
    }

    public createGlobalSfx(scene: Phaser.Scene)
    {
        for (const [name] of this.globalSfx)
        {
            this.globalSfx.set(name, scene.sound.add(name, {volume: 0.5}) as Sound);
        }
    }

    public setAllMute(muted: boolean): void
    {
        this._allMuted = muted;
        this.setMusicMute(this._musicMuted);
        this.setSfxMute(this._sfxMuted);
        this.setVOMute(this._voMuted);
    }

    public stopAllVOClips(): void
    {
        if (this.currentVOClip && this.currentVOClip.removeAllListeners && this.currentVOClip.stop)
        {
            this.currentVOClip.removeAllListeners('stop');
            this.currentVOClip.stop();
            this.currentVOClip = null;
        }

        if (!this.currentVOClips)
        {
            return;
        }
        for (let i = 0; i < this.currentVOClips.length; i++)
        {
            if (this.currentVOClips[i])
            {
                this.currentVOClips[i].removeAllListeners('complete');
                if (this.currentVOClips[i] != this.currentVOClip)
                {
                    this.currentVOClips[i].stop();
                }
            }
            else
            {
                console.error('cannot stop audioclip', this.currentVOClips[i]);
                console.error('full array of clips', this.currentVOClips);
            }
        }
        this.currentVOClips = null;
    }

    public async playVOClips(audioClips:Sound[]): Promise<void>
    {
        this.stopAllVOClips();

        if (!audioClips)
        {
            console.warn('trying to play audio clips, but there are none', audioClips);
            return;
        }

        this.currentVOClips = audioClips;
        audioClips = audioClips.slice();
        while (audioClips.length)
        {
            const clip = audioClips.shift();
            if (!clip)
            {
                console.error('Audioclip is missing, there\'s probably an issue with the clip', clip);
                console.error('Full array', this.currentVOClips);
                continue;
            }
            await this.playSingleVOClip(clip);
        }
    }

    public playMusic(music:Sound, loop = true): void
    {
        // this.stopMusic();
        music.play({loop, mute: this._musicMuted || this._allMuted});
        this.musicClips.push(music);
    }

    public stopMusic(): void
    {
        if (this.musicClips?.length > 0)
        {
            for (let i = 0; i < this.musicClips.length; i++)
            {
                this.musicClips[i].stop();
            }
        }
        this.musicClips = [];
    }

    public setMusicMute(muted:boolean): void
    {
        this._musicMuted = muted;
        if (this.musicClips?.length > 0)
        {
            for (let i = 0; i < this.musicClips.length; i++)
            {
                this.musicClips[i].mute = muted || this._allMuted;
            }
        }
    }

    public playSfx(sfx: Sound, stop = false, loop = false): void
    {
        if (!sfx)
        {
            console.error('sfx is missing or broken', sfx);
            return;
        }
        if (stop || this._sfxMuted)
        {
            this.stopSfx();
        }
        if (this._sfxMuted && !loop)
        {
            return;
        }
        sfx.play({loop, mute: this._sfxMuted || this._allMuted});
        this.sfxClips.add(sfx);
        sfx.on('stop', () => this.removeSFX(sfx));
        sfx.on('complete', () => this.removeSFX(sfx));
    }

    public stopSfx(): void
    {
        if (this.sfxClips.size > 0)
        {
            for (const clip of this.sfxClips.values())
            {
                clip.off('stop');
                clip.off('complete');
                clip.stop();
            }
        }
        this.sfxClips.clear();
    }

    private removeSFX(clip: Sound)
    {
        clip.off('stop');
        clip.off('complete');
        this.sfxClips.delete(clip);
    }

    public setSfxMute(muted: boolean): void
    {
        this._sfxMuted = muted;
        if (this.sfxClips.size > 0)
        {
            for (const clip of this.sfxClips.values())
            {
                clip.mute = muted || this._allMuted;
            }
        }
    }

    public setVOMute(muted: boolean): void
    {
        this._voMuted = muted;
        if (this.currentVOClip)
        {
            this.currentVOClip.mute = muted || this._allMuted;
        }
    }

    public playSingleVOClip(audio: Sound): Promise<void>
    {
        if (!audio || !audio.on)
        {
            console.error('Cannot play audio clip', audio);
            return Promise.resolve();
        }
        this.stopAllVOClips();
        this.currentVOClip = audio;
        audio.mute = this._voMuted || this._allMuted;
        return new Promise(resolve =>
        {
            audio.on('complete', () =>
            {
                audio.off('complete');
                resolve();
            });
            audio.play();
        });
    }

    public setVOPaused(pause: boolean): void
    {
        if (this.currentVOClip)
        {
            if (pause) this.currentVOClip.pause();
            else this.currentVOClip.resume();
        }
    }
}