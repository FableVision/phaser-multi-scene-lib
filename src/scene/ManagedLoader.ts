import type { BaseScene } from './BaseScene';
import { Sound } from '../audio';

export interface AudioFileData
{
    /** ID may be present, in case you had an array of AudioFileData */
    id?: string;
    /** List of urls to audio files, in order of preference (i.e. opus, caf, mp3) */
    audio: string[];
    /** Loaded Sound will get stored here, for easy access when loaded and to prevent reloads. */
    audioObj?: Sound;
    /** Volume, if one wants a quieter default volume than 1 */
    volume?: number;
}

type LoadedType = 'json'|'atlas'|'spritesheet'|'spine'|'image'|'audio';
interface LoadInfo
{
    type: LoadedType;
    multiFile?: Phaser.Loader.MultiFile|null;
}

function IsNotNull<T>(test: T | null): test is T
{
    return test != null;
}

export class ManagedLoader
{
    private scene: BaseScene<any, any>;
    private loadedTypeByKey: {[key:string]: LoadInfo};
    private pendingLoad: boolean;

    constructor(scene: BaseScene<any, any>)
    {
        this.scene = scene;
        this.loadedTypeByKey = {};
        this.pendingLoad = false;
    }

    public isLoadedOrLoading(key: string): boolean
    {
        return !!this.loadedTypeByKey[key];
    }

    public load(): Promise<void>
    {
        if (!this.pendingLoad) return Promise.resolve();

        return new Promise(resolve =>
        {
            this.scene.load.once('complete', () =>
            {
                this.pendingLoad = false;
                setTimeout(resolve, 1);
            });
            this.scene.load.start();
        });
    }

    public json(key:string, url:string): void
    {
        if (this.scene.cache.json.has(key)) return;
        this.scene.load.json(key, url);
        this.loadedTypeByKey[key] = { type: 'json' };
        this.pendingLoad = true;
    }

    public atlas(key: string, url: string): void
    {
        if (this.scene.textures.exists(key)) return;
        this.scene.load.atlas(key, url.replace('.json', '.png'), url);
        this.loadedTypeByKey[key] = { type: 'atlas' };
        this.pendingLoad = true;
    }

    public spritesheet(key: string, url: string, frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig): void
    {
        if (this.scene.textures.exists(key)) return;
        this.scene.load.spritesheet(key, url, frameConfig);
        this.loadedTypeByKey[key] = { type: 'spritesheet' };
        this.pendingLoad = true;
    }

    public spine(key: string, skeleton: string, atlas:string, premultipliedAlpha = false): void
    {
        if (this.scene.spine.cache.has(key)) return;
        this.scene.load.spine(key, skeleton, atlas, premultipliedAlpha);
        const multiFile = this.scene.load.list.entries[this.scene.load.list.size - 1].multiFile;
        this.loadedTypeByKey[key] = { type: 'spine', multiFile };
        this.pendingLoad = true;
    }

    public multiatlas(key: string, atlasJson: string|object, baseUrl?: string): void
    {
        if (this.scene.textures.exists(key)) return;
        this.scene.load.multiatlas(key, atlasJson as any, baseUrl);
        // const multiFile = this.scene.load.list.entries[this.scene.load.list.size - 1].multiFile;
        this.loadedTypeByKey[key] = { type: 'image' };
        this.pendingLoad = true;
    }

    public image(key: string, url: string): void
    {
        if (this.scene.textures.exists(key)) return;
        this.scene.load.image(key, url);
        this.loadedTypeByKey[key] = { type: 'image' };
        this.pendingLoad = true;
    }

    /** Returns a promise with the loaded sound */
    public audio(key: string, urls: string[], volume = 1, loop = false): Promise<Sound>
    {
        if (this.scene.cache.audio.has(key)) return Promise.resolve(this.scene.sound.get(key) as Sound);
        if (!urls)
        {
            console.error('Audio has no urls', key, urls);
            return Promise.reject('Audio has no urls');
        }
        this.pendingLoad = true;
        // if (__DEV__)
        // {
        //     if (urls.length < 3)
        //     {
        //         console.warn(`Warning! Audio ${key} does not have 3 files - is it missing a format?`, urls);
        //     }
        //     if (!urls[urls.length - 1].endsWith('mp3'))
        //     {
        //         console.warn(`Warning! Audio ${key} does not fall back to mp3!`, urls);
        //     }
        // }
        this.scene.load.audio(key, urls);
        this.loadedTypeByKey[key] = { type: 'audio' };
        return new Promise(resolve =>
        {
            const fileLoaded = (loadedKey: string) =>
            {
                if (loadedKey === key)
                {
                    this.scene.load.off('filecomplete', fileLoaded);
                    if (this.scene.cache.audio.get(key))
                    {
                        resolve(this.scene.sound.add(key, {volume, loop}) as Sound);
                    }
                    else
                    {
                        console.error('cannot add audio file from cache, are you loading something else with the same key? ', key);
                    }
                }
            };
            this.scene.load.on('filecomplete', fileLoaded);
        });
    }

    /**
     * Preloads everything in a dictionary of dialogue objects. Note that the paths must be hooked up through
     * webpack.
     * @param object Dictionary of dialogue to load.
     * @param excludeKeywords List of keywords to search dialogue ids for to exclude them from loading.
     */
    public preloadAudioObject(object: {[name:string]: AudioFileData}, excludeKeywords:string[] = []): void
    {
        if (!object) return;

        const promptKeys = Object.keys(object);
        const list = promptKeys.map(key => {
            const data = object[key];
            if (!data)
            {
                console.warn(`Audio entry ${key} is missing!`);
                return null;
            }
            if (!data.id)
            {
                data.id = key;
            }
            return data;
        }).filter(IsNotNull);
        this.preloadAudioList(list, excludeKeywords);
    }

    /**
     * Preloads everything in a list of audio objects. Each object must have an id. Note that the paths must be hooked up through
     * webpack.
     * @param list Dictionary of audio to load.
     * @param excludeKeywords List of keywords to search audio ids for to exclude them from loading.
     */
    public preloadAudioList(list: AudioFileData[], excludeKeywords: string[] = []): void
    {
        if (!list) return;

        for (let i = 0; i < list.length; i++)
        {
            const data = list[i];
            const id = data.id!;
            let shouldSkip = false;
            if (excludeKeywords && excludeKeywords.length)
            {
                for (let j = 0; j < excludeKeywords.length; j++)
                {
                    if (id.indexOf(excludeKeywords[j]) > -1)
                    {
                        shouldSkip = true;
                        break;
                    }
                }
            }
            // skip anything excluded
            if (shouldSkip) continue;
            if (!data.audio || !Array.isArray(data.audio))
            {
                if (!data.audio)
                {
                    console.warn(`Audio entry '${id}' is invalid, because no audio paths were provided.`, data);
                }
                else
                {
                    console.warn(`skipping audio entry '${id}' because audio is not a valid array of paths`);
                }
                continue;
            }
            // skip anything already loaded
            if (data.audioObj) continue;

            // load, then set on the object for later use
            this.audio(id, data.audio, data.volume).then(sound => data.audioObj = sound);
        }
    }

    public unload(keys: string[]): void
    {
        for (const key of keys)
        {
            const info = this.loadedTypeByKey[key];
            if (!info) continue;
            switch (info.type)
            {
                case 'image':
                    this.scene.textures.remove(key);
                    break;
                case 'json':
                    this.scene.cache.json.remove(key);
                    break;
                case 'audio':
                    this.scene.sound.removeByKey(key);
                    this.scene.cache.audio.remove(key);
                    break;
                case 'atlas':
                    this.scene.textures.remove(key);
                    this.scene.cache.json.remove(key);
                    break;
                case 'spritesheet':
                    this.scene.textures.remove(key);
                    break;
                case 'spine':
                    for (const file of info!.multiFile!.files)
                    {
                        // cache reference on the file is null, so we need to manually remove from the cache
                        // for the cached subfiles
                        switch (file.type)
                        {
                            case 'json':
                                this.scene.cache.json.remove(file.key);
                                break;
                            case 'image':
                                this.scene.textures.remove(file.key);
                                break;
                        }
                    }
                    this.scene.cache.custom.spine.remove(key);
                    if (this.scene.cache.custom.spineTextures.has(key))
                    {
                        this.scene.cache.custom.spineTextures.remove(key);
                    }
                    break;
            }
            delete this.loadedTypeByKey[key];
        }
    }

    public unloadAll(): void
    {
        this.unload(Object.keys(this.loadedTypeByKey));
    }
}