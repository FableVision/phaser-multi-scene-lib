import Phaser from 'phaser';

import { BaseGame } from '../game';
import { ManagedLoader } from './ManagedLoader';
import { DisposableGroup, globalTimer, promises } from '@fablevision/utils';
import { Sound } from '../audio';

/** Can be extended by specific games needs */
export interface BaseDialogueData
{
    /** Urls of audio files (the different formats). */
    audio: string[];
    /** Text/caption for the audio file. */
    text?: string;
}

export interface CaptionHandler
{
    /** Needs some sort of text setter. */
    text: string;
}

// base class that all games branch off from!!!
export class BaseScene<S, A> extends Phaser.Scene
{
    public game!: BaseGame<S, A>;
    protected args!: A;
    public staticConfig!: S;
    public mLoad: ManagedLoader = new ManagedLoader(this);
    public spine!: SpinePlugin;
    protected cleanup!: DisposableGroup;
    /** This can be overridden by specific games for stronger typing */
    public dialogueData!: {[key:string]: BaseDialogueData};
    public captionHandler!: CaptionHandler|null;
    /**
     * Override the home button's default behavior of returning to the main menu. When at the root
     * level of your activity, this should be returned to null so that players can leave the activity.
     */
    public homeButtonCallback!: (() => void)|null;

    /**
     * This method is called by the game before the scene gets to load - it is where you would do any
     * setup based on the content data.
     * It is asynchronous to allow the loading of specific content files in response to arguments.
     */
    async initialize(staticConfig: S, args: A): Promise<void>
    {
        this.staticConfig = staticConfig;
        this.args = args;
        this.captionHandler = null;
        this.homeButtonCallback = null;

        this.cleanup = new DisposableGroup();
    }

    preload(): void
    {
        // to be overridden
    }

    create(): void
    {
        // do a quick wait to try to let any promise based hooks to resolve
        promises.wait(1).then(() =>
        {
            this.events.emit('loaded');
        })
    }

    /**
     * Start gameplay. Games should override this in order to start gameplay, after loading has finished.
     */
    public start(): void
    {
        // to be overridden
    }

    /**
     * To be overridden by activities to handle any activity specific stuff
     */
    resize(): void
    {
        // no op
    }

    /**
     * Override for cleanup that needs to happen asynchronously.
     * (I don't think there will be any for a local-only game, but just in case.)
     */
    asyncShutdown(): Promise<void>
    {
        return Promise.resolve();
    }

    shutdown(): void
    {
        // stop all playback
        this.game.audioManager.stopMusic();
        this.game.audioManager.stopSfx();
        this.tweens.killAll();
        // do any cleanup of disposables we are tracking
        this.cleanup.dispose();
        // unload all assets
        this.mLoad.unloadAll();
    }

    /**
     * Waits a specified number of milliseconds. This timer is attached to the scene, so will be paused
     * or stopped with the scene. It can't be cancelled otherwise.
     */
    public wait(milliseconds: number): Promise<void>
    {
        return new Promise(resolve =>
        {
            this.time.delayedCall(milliseconds, resolve);
        });
    }

    update(time: number, delta: number): void
    {
        // while an activity is running (not paused), the utility timer should get ticked so that
        // any interactivity features relying on the timer function.
        globalTimer.tick();
    }

    /**
     * Shorthand to play sfx by name from the audio cache.
     */
    public playSfx(name: string): void
    {
        const sound = (this.sound.get(name) as Sound) || this.game.audioManager.globalSfx.get(name as any);
        if (sound)
        {
            console.error(`Audio ${name} is not loaded, can't play sfx`);
            return;
        }
        this.game.audioManager.playSfx(sound);
    }

    public async doDialogue(audio: string|string[], hideText?: boolean): Promise<void>
    {
        if (Array.isArray(audio))
        {
            for (let i = 0; i < audio.length; ++i)
            {
                await this.doDialogue(audio, hideText);
            }
            return;
        }

        if (!this.cache.audio.has(audio))
        {
            console.error(`Unable to find VO '${audio}', skipping`);
            return;
        }
        if (!hideText && this.captionHandler)
        {
            this.captionHandler.text = this.dialogueData[audio].text!;
        }
        await this.game.audioManager.playSingleVOClip(this.sound.get(audio) as Sound);
    }
}
