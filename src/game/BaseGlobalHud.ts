import Phaser from 'phaser';
import { BaseGame } from './BaseGame';
import { ExtPromise } from '@fablevision/utils';
import { Interactive } from '@fablevision/interaction';

export class BaseGlobalHud<H> extends Phaser.Scene
{
    public game!: BaseGame<any, any>;
    public hudInteractive: Interactive[] = [];

    /** Have all initial assets loaded? */
    public loaded: ExtPromise<void> = new ExtPromise();

    constructor()
    {
        super({});
    }

    init(): void
    {
        // request a game resize, to resize us
        this.game.resize();
    }

    public resize(width: number, height: number, scale: number)
    {
    }

    preload(): void
    {
    }

    create(): void
    {
        this.loaded.resolve();
    }

    public showHud(config?: boolean|H): void
    {
    }

    public hideHud(): void
    {
    }

    public showLoader(): Promise<void>
    {
        return Promise.resolve();
    }

    /**
     * @param percentComplete A value between 0-1
     */
    public updateProgress(percentComplete: number): void
    {
    }

    public hideLoader(): Promise<void>
    {
        return Promise.resolve();
    }
}