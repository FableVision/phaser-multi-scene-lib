/// <reference path='../node_modules/phaser/types/SpineGameObject.d.ts' />
/// <reference path='../node_modules/phaser/types/SpinePlugin.d.ts' />

export * from './scene';
export * from './game';
export type { Sound } from './audio';

export {
    InteractionManager, Interactive, DragStrategy, DragType, complex, drag, StandaloneGroup,
    Keyboard, KeyboardActivateStrategy, fromKey,
} from '@fablevision/interaction';
import type { FullFocusContext, KeyConfig, KeyEvent, IPoint, InteractiveList, InteractiveOpts } from '@fablevision/interaction';
export { FullFocusContext, KeyConfig, KeyEvent, IPoint, InteractiveList, InteractiveOpts };
export { PhaserInteractive } from '@fablevision/interaction/dist/phaser';
export * from '@fablevision/utils';