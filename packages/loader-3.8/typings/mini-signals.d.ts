declare module "mini-signals"
{
    namespace MiniSignal
    {
        interface MiniSignalBinding
        {
            detach(): boolean;
        }
    }

    class MiniSignal<CbType>
    {
        constructor();
        handlers(exists: true): boolean;
        handlers(exists?: false): MiniSignal.MiniSignalBinding[];
        has(node: MiniSignal.MiniSignalBinding): boolean;
        add(fn: CbType, thisArg?: any): MiniSignal.MiniSignalBinding;
        once(fn: CbType, thisArg?: any): MiniSignal.MiniSignalBinding;
        detach(node: MiniSignal.MiniSignalBinding): MiniSignal<CbType>;
        detachAll(): MiniSignal<CbType>;

        dispatch: CbType;
    }

    export default MiniSignal;
}
