import Phaser from 'phaser';
// Include Spine!
import 'phaser/plugins/spine/dist/SpinePlugin.js';
import { AudioManager } from '../audio';
import { BaseGlobalHud } from './BaseGlobalHud';
import { BaseScene } from '../activity';
import { InteractionManager, Keyboard } from '@fablevision/interaction';
import { PhaserHandler } from '@fablevision/interaction/dist/phaser';

import '../main.css';

export type SceneConstructor<S, A> = new (config: string|Phaser.Types.Scenes.SettingsConfig) => BaseScene<S, A>;

const ACTIVITY_KEY = 'activity';

export class BaseGame<S, A> extends Phaser.Game
{
    public audioManager: AudioManager;
    public interaction: InteractionManager;
    public keyboard: Keyboard;
    public globalScale: number;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected _currentActivity: BaseScene<S, A>|null;
    protected globalHud: BaseGlobalHud<any>;
    private uiDiv: HTMLDivElement;

    private resizeTimer: number;
    protected navigating: boolean;
    private designWidth: number;
    private designHeight: number;
    private baseTitle: string;

    public get currentActivity(): BaseScene<S, A>
    {
        return this._currentActivity!;
    }

    constructor(phaserParams: Phaser.Types.Core.GameConfig &
        {
            width: number,
            height: number,
            baseTitle?: string,
            hudConstructor: new () => BaseGlobalHud<any>,
        })
    {
        super(Object.assign({
            type: Phaser.AUTO,
            parent: 'content',
            // transparent so that video can go behind
            transparent: true,
            plugins: {
                scene: [
                    { key: 'SpinePlugin', plugin: SpinePlugin, mapping: 'spine' },
                ],
            },
            // disable phaser's input, we'll be doing it externally
            input: false,
        }, phaserParams));

        this.designWidth = phaserParams.width;
        this.designHeight = phaserParams.height;
        this.baseTitle = phaserParams.baseTitle || '';

        // help Phaser out by telling it if we can use caf contained opus
        (this.device.audio as any).caf = !!(document.createElement('audio').canPlayType('audio/x-caf; codecs="opus"').replace(/^(no|maybe)$/, ''));

        this.globalScale = 1;
        this.navigating = false;
        this._currentActivity = null;

        this.audioManager = new AudioManager();

        this.uiDiv = document.getElementById('ui') as HTMLDivElement;
        this.keyboard = new Keyboard();
        this.interaction = new InteractionManager({
            renderer: new PhaserHandler(this),
            accessibilityDiv: this.uiDiv,
        });

        this.globalHud = new phaserParams.hudConstructor();
        this.scene.add('hud', this.globalHud, true);

        // debounce the resize events to a degree
        this.resizeTimer = 0;
        const resize = () =>
        {
            this.resizeTimer = 0;
            this.resize();
        };
        window.addEventListener('resize', () =>
        {
            if (this.resizeTimer)
            {
                clearTimeout(this.resizeTimer);
            }

            this.resizeTimer = setTimeout(resize, 50) as any;
        });
    }

    /** To be overridden by a subclass */
    protected getStaticConfig(_id: string): S
    {
        return null as any;
    }

    /** To be overridden by a subclass */
    protected getSceneConstructor(_id: string): Promise<SceneConstructor<S, A>>
    {
        return Promise.resolve(null as any);
    }

    protected async loadAndStart(stateProm: Promise<SceneConstructor<S, A>>, staticConfig: S, args?: A):Promise<void>
    {
        await this.globalHud.loaded.promise;
        const state = await stateProm;

        this.startActivity(ACTIVITY_KEY, state, staticConfig, args);
    }

    protected async startActivity(name:string, state: SceneConstructor<S, A>, staticConfig: S, args?: A): Promise<void>
    {
        this.scene.add(name, state);
        const scene = this._currentActivity = this.scene.getScene(name) as BaseScene<S, A>;
        // allow loading content with an async initialize
        await scene.initialize(staticConfig, args || {} as any);
        this.updateTitle();
        this.updateUrl({}, false);
        const progress = (p:number) => this.globalHud.updateProgress(p);
        scene.load.on('progress', progress);
        scene.events.once('loaded', () =>
        {
            // activate hud if desireable
            this.globalHud.showHud((scene.staticConfig as any).hud);
            this.restoreFocusBaseline();
            this.scene.moveAbove<Phaser.Scene>(scene, this.globalHud);
            this.resize();
            scene.load.off('progress', progress);
            this.hideLoader().then(() => scene.start());
        });
        this.scene.start(name);
        this.navigating = false;
    }

    public restoreFocusBaseline(): void
    {
        this.interaction.setBaseline([], this.globalHud.hudInteractive);
    }

    /**
     * Shows/hides all of or a portion of the global hud.
     */
    public showHud<H>(config: boolean|H): void
    {
        this.globalHud.showHud(config);
    }

    /**
     * Shows the loader, attaches listeners to know when the current activity's load makes progress and finishes
     * and then resolves when the loader has been hidden.
     */
    public runLoader(): [loaded: Promise<void>, visible: Promise<void>]
    {
        const shown = this.showLoader();
        const progress = (p: number) => this.globalHud.updateProgress(p);
        this._currentActivity!.load.on('progress', progress);
        const complete = new Promise<void>(resolve =>
        {
            this._currentActivity!.load.once('complete', resolve);
            this._currentActivity!.load.off('progress', progress);
        });
        const shownAndLoaded = Promise.all([complete, shown]);
        return [shownAndLoaded as any, shownAndLoaded.then(() => this.hideLoader())];
    }

    public updateUrl<T>(_args: T, _replace = true): void
    {
        this.updateTitle();
        // to be overridden by subclass
    }

    protected updateTitle(): void
    {
        const name = (this._currentActivity!.staticConfig as any)?.title;
        if (name)
        {
            document.title = `${this.baseTitle ? this.baseTitle + ': ' : ''}${name}`;
        }
        else
        {
            document.title = this.baseTitle;
        }
    }

    /** Return to the main menu. */
    public goToMainMenu(): Promise<void>
    {
        return this.goToActivity('main-menu');
    }

    /** Exit the current activity, returning to whence the user game. */
    public async exitActivity(): Promise<void>
    {
        if (this.navigating) return;
        await this.endCurrentActivity();
    }

    protected async endCurrentActivity(): Promise<void>
    {
        this.navigating = true;
        // this.activityHud.deactivate();
        await this.showLoader();
        if (this._currentActivity)
        {
            await this._currentActivity.asyncShutdown();
            this._currentActivity.shutdown();
            this.scene.remove(ACTIVITY_KEY);
            this._currentActivity = null;
        }
        // reset InteractionManager and keyboard
        this.interaction.reset();
        this.interaction.setBaseline([], []);
        this.keyboard.clearContexts();
    }

    /**
     * Go to an activity, finding metadata and default args
     */
    public async goToActivity(activityId: string): Promise<void>
    {
        if (this.navigating) return;
        return this.goToActivityWithArgs(activityId, {} as any);
    }

    protected async goToActivityWithArgs(activityId: string, args: A): Promise<void>
    {
        if (this.navigating) return;
        await this.endCurrentActivity();

        const metadata = this.getStaticConfig(activityId);
        if (!metadata)
        {
            console.error('Unable to go to unknown activity: ', activityId);
            return;
        }
        this.loadAndStart(this.getSceneConstructor(activityId), metadata, args);
    }

    /**
     * Shows loader. Returns a promise that resolves when loader is fully visible.
     */
    public showLoader(): Promise<void>
    {
        this.interaction.enabled = false;
        return this.globalHud.showLoader();
    }

    /**
     * Hides loader. Returns a promise that resolves when loader is fully hidden.
     */
    public async hideLoader(): Promise<void>
    {
        await this.globalHud.hideLoader();
        this.interaction.enabled = true;
    }

    public setActivityPaused(paused: boolean): void
    {
        if (this._currentActivity)
        {
            this._currentActivity.time.paused = paused;
            this.audioManager.setVOPaused(paused);
        }
    }

    public get width(): number
    {
        return this.renderer.width;
    }

    public get height(): number
    {
        return this.renderer.height;
    }

    public resize(): void
    {
        // assume game was not made for variable aspect ratios
        const layoutWidth = this.designWidth;
        const layoutHeight = this.designHeight;

        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        const scale = Math.min(width / this.designWidth, height / this.designHeight);
        // -- PHASER -- //
        this.canvas.style.width = `${layoutWidth * scale}px`;
        this.canvas.style.height = `${layoutHeight * scale}px`;
        // -- INTERACTION -- //
        this.uiDiv.style.width = `${layoutWidth}px`;
        this.uiDiv.style.height = `${layoutHeight}px`;
        this.uiDiv.style.transform = `translate(-50%, -50%) scale(${scale})`;

        this.globalHud.resize(layoutWidth, layoutHeight, scale);

        this._currentActivity?.resize();
    }
}
