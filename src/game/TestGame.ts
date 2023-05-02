import { BaseGame, SceneConstructor } from './BaseGame';

/**
 * This class does some special things to quickly load a single scene.
 * Example args generation:
 *
 *     const urlParams = new URLSearchParams(location.search);
 *     const args = {
 *         level: urlParams.has('level') ? parseInt(urlParams.get('level')!, 10) : undefined,
 *     };
 *     new TestGame().loadTestState(TestState, {}, args);
 */
export class TestGame<S, A> extends BaseGame<S, A>
{
    public loadTestState(state: SceneConstructor<S, A>, staticConfig: S, args: A):void
    {
        this.loadAndStart(Promise.resolve(state), staticConfig, args);
    }
}